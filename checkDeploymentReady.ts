import { ethers, network } from "hardhat";
import { validateDeploymentEnvironment } from "./deployConfig";

const MINIMUM_DEPLOYER_BALANCE = ethers.parseEther("0.10");

async function main() {
  const cfg = validateDeploymentEnvironment();

  if (network.name !== "celoSepolia") {
    throw new Error("Deployment readiness requires the celoSepolia network.");
  }

  const expectedChainId = 11142220n;
  const configuredChainId = network.config.chainId;
  if (configuredChainId !== Number(expectedChainId)) {
    throw new Error(
      `Wrong configured chain ID: expected ${expectedChainId}, got ${configuredChainId ?? "unset"}.`,
    );
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network: ${network.name}`);
  console.log(`Balance: ${ethers.formatEther(balance)} CELO`);

  console.log("✓ SEPOLIA_RPC_URL configured");
  console.log("✓ PRIVATE_KEY configured");
  console.log("✓ USDM_ADDRESS_CELO_SEPOLIA configured");
  console.log("✓ GENERAL_TREASURY configured");
  console.log("✓ EDUCATION_TREASURY configured");
  console.log("✓ REFORESTATION_TREASURY configured");
  console.log("✓ GOVERNANCE_TREASURY configured");

  const actualChainId = (await ethers.provider.getNetwork()).chainId;
  if (actualChainId !== expectedChainId) {
    throw new Error(
      `Wrong chain ID: expected ${expectedChainId}, got ${actualChainId}.`,
    );
  }

  if (balance < MINIMUM_DEPLOYER_BALANCE) {
    throw new Error(
      `Insufficient deployer CELO balance: ${ethers.formatEther(balance)} CELO. ` +
        `At least ${ethers.formatEther(MINIMUM_DEPLOYER_BALANCE)} CELO is required for the full deployment.`,
    );
  }

  if (
    !cfg.usdm ||
    !cfg.generalTreasury ||
    !cfg.educationTreasury ||
    !cfg.reforestationTreasury ||
    !cfg.governanceTreasury
  ) {
    throw new Error("Deployment addresses must be configured.");
  }

  const tokenCode = await ethers.provider.getCode(cfg.usdm);
  if (tokenCode === "0x") {
    throw new Error(
      `Configured USDm address has no contract bytecode on ${network.name}.`,
    );
  }

  const token = new ethers.Contract(
    cfg.usdm,
    [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ],
    ethers.provider,
  );
  const [symbol, decimals] = await Promise.all([
    token.symbol(),
    token.decimals(),
  ]);
  if (symbol !== "USDm" || decimals !== 18n) {
    throw new Error(
      `Unexpected USDm metadata on ${network.name}: symbol or decimals do not match the protocol.`,
    );
  }

  console.log(
    "Preflight checks passed: live-network config and wallet funds are present.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
