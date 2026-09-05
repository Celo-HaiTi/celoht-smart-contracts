import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { validateDeploymentEnvironment } from "./deployConfig";

/**
 * Deploys the full CeloHT protocol contract set to the configured network.
 *
 * SAFETY:
 * - Only Celo Sepolia (chain ID 11142220) is an accepted deployment target.
 * - All addresses (USDm, all four treasuries) are loaded and validated
 *   through the single centralized config/deployConfig.ts module — this
 *   script does not read process.env directly and does not duplicate any
 *   address literal.
 * - Fails safely with a clear error if a required real-network address is
 *   missing or malformed. Never silently substitutes a different address.
 */

const FEES = {
  registration: ethers.parseUnits("0.20", 18),
  p2p: ethers.parseUnits("0.010", 18),
  education: ethers.parseUnits("0.020", 18),
  certificate: ethers.parseUnits("0.010", 18),
  vote: ethers.parseUnits("0.010", 18),
};

const MINIMUM_DEPLOYER_BALANCE = ethers.parseEther("0.10");

async function main() {
  if (network.name !== "celoSepolia") {
    throw new Error(
      "Refusing deployment: this repository targets Celo Sepolia only. " +
        "Use --network celoSepolia.",
    );
  }

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  if (chainId !== 11142220n) {
    throw new Error(`Refusing deployment on unexpected chain ID ${chainId}.`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < MINIMUM_DEPLOYER_BALANCE) {
    throw new Error(
      `Insufficient deployer CELO balance: ${ethers.formatEther(balance)} CELO. ` +
        `At least ${ethers.formatEther(MINIMUM_DEPLOYER_BALANCE)} CELO is required for the full deployment.`,
    );
  }

  console.log(`Network: ${network.name} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const cfg = validateDeploymentEnvironment();

  const usdmAddress = cfg.usdm;
  const generalTreasury = cfg.generalTreasury;
  const educationTreasury = cfg.educationTreasury;
  const reforestationTreasury = cfg.reforestationTreasury;
  const governanceTreasury = cfg.governanceTreasury;

  const outDir = path.join(__dirname, "deployments");
  const outFile = path.join(outDir, `${network.name}.json`);
  if (fs.existsSync(outFile)) {
    throw new Error(
      `Refusing to overwrite existing deployment manifest at ${outFile}. Review it before starting a fresh deployment.`,
    );
  }

  console.log(`USDm: ${usdmAddress}`);
  console.log(`General Treasury: ${generalTreasury}`);
  console.log(`Education Treasury: ${educationTreasury}`);
  console.log(`Reforestation Treasury: ${reforestationTreasury}`);
  console.log(`Governance Treasury: ${governanceTreasury}`);

  // --- Deploy ---
  const Registry = await ethers.getContractFactory("CeloHTAgentRegistry");
  const registry = await Registry.deploy(
    usdmAddress,
    generalTreasury,
    FEES.registration,
    deployer.address,
  );
  await registry.waitForDeployment();
  console.log(`CeloHTAgentRegistry: ${await registry.getAddress()}`);

  const Payments = await ethers.getContractFactory("CeloHTServicePayments");
  const payments = await Payments.deploy(
    usdmAddress,
    await registry.getAddress(),
    generalTreasury,
    deployer.address,
    FEES.p2p,
    FEES.education,
  );
  await payments.waitForDeployment();
  console.log(`CeloHTServicePayments: ${await payments.getAddress()}`);

  const Education = await ethers.getContractFactory("CeloHTEducation");
  const education = await Education.deploy(
    usdmAddress,
    educationTreasury,
    FEES.certificate,
    deployer.address,
  );
  await education.waitForDeployment();
  console.log(`CeloHTEducation: ${await education.getAddress()}`);

  const Reforestation = await ethers.getContractFactory("CeloHTReforestation");
  const reforestation = await Reforestation.deploy(
    usdmAddress,
    reforestationTreasury,
    deployer.address,
  );
  await reforestation.waitForDeployment();
  console.log(`CeloHTReforestation: ${await reforestation.getAddress()}`);

  const Governance = await ethers.getContractFactory("CeloHTGovernance");
  const governance = await Governance.deploy(
    usdmAddress,
    governanceTreasury,
    FEES.vote,
    deployer.address,
  );
  await governance.waitForDeployment();
  console.log(`CeloHTGovernance: ${await governance.getAddress()}`);

  // --- Record deployment artifact (real data only — no fabricated hashes) ---
  let gitCommit = "unknown";
  try {
    gitCommit = execSync("git rev-parse HEAD").toString().trim();
  } catch {
    console.warn(
      "⚠️  Could not read git commit (not a git repo or git unavailable).",
    );
  }

  const deploymentTx = registry.deploymentTransaction();

  const manifest = {
    network: network.name,
    chainId: Number(chainId),
    deployer: deployer.address,
    usdm: usdmAddress,
    generalTreasury,
    educationTreasury,
    reforestationTreasury,
    governanceTreasury,
    treasuryConfiguration:
      generalTreasury === educationTreasury &&
      generalTreasury === reforestationTreasury &&
      generalTreasury === governanceTreasury
        ? "Option A — all four treasury categories intentionally use the same confirmed CeloHT Treasury Safe"
        : "Separated — treasury categories use distinct confirmed Safe addresses",
    agentRegistry: await registry.getAddress(),
    servicePayments: await payments.getAddress(),
    education: await education.getAddress(),
    reforestation: await reforestation.getAddress(),
    governance: await governance.getAddress(),
    deploymentBlock: deploymentTx
      ? ((await deploymentTx.wait())?.blockNumber ?? null)
      : null,
    transactionHashes: {
      agentRegistry: deploymentTx?.hash ?? null,
      servicePayments: payments.deploymentTransaction()?.hash ?? null,
      education: education.deploymentTransaction()?.hash ?? null,
      reforestation: reforestation.deploymentTransaction()?.hash ?? null,
      governance: governance.deploymentTransaction()?.hash ?? null,
    },
    deploymentTimestamp: new Date().toISOString(),
    compilerVersion: "0.8.24",
    optimizerRuns: 200,
    gitCommit,
    verification: "NOT VERIFIED — run scripts/verifyContracts.ts",
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`\nDeployment manifest written to ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
