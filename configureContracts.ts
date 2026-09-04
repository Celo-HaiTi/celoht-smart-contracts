import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Post-deployment configuration / sanity pass. Reads the deployment
 * manifest written by deployAll.ts and verifies on-chain state matches the
 * intended configuration. Does NOT change any values silently — it reports
 * mismatches for a human to resolve.
 */
async function main() {
  if (network.name !== "celoSepolia") {
    throw new Error("Contract configuration requires the celoSepolia network.");
  }

  const manifestPath = path.join(
    __dirname,
    "deployments",
    `${network.name}.json`,
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `No deployment manifest found at ${manifestPath}. Run deployAll.ts first.`,
    );
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  const registry = await ethers.getContractAt(
    "CeloHTAgentRegistry",
    manifest.agentRegistry,
  );
  const payments = await ethers.getContractAt(
    "CeloHTServicePayments",
    manifest.servicePayments,
  );
  const education = await ethers.getContractAt(
    "CeloHTEducation",
    manifest.education,
  );
  const reforestation = await ethers.getContractAt(
    "CeloHTReforestation",
    manifest.reforestation,
  );
  const governance = await ethers.getContractAt(
    "CeloHTGovernance",
    manifest.governance,
  );

  const checks: { label: string; expected: string; actual: string }[] = [
    {
      label: "Registry.treasury",
      expected: manifest.generalTreasury,
      actual: await registry.treasury(),
    },
    {
      label: "Payments.treasury",
      expected: manifest.generalTreasury,
      actual: await payments.treasury(),
    },
    {
      label: "Education.treasury",
      expected: manifest.educationTreasury,
      actual: await education.treasury(),
    },
    {
      label: "Reforestation.treasury",
      expected: manifest.reforestationTreasury,
      actual: await reforestation.treasury(),
    },
    {
      label: "Governance.treasury",
      expected: manifest.governanceTreasury,
      actual: await governance.treasury(),
    },
  ];

  let allOk = true;
  for (const check of checks) {
    const ok = check.expected.toLowerCase() === check.actual.toLowerCase();
    allOk = allOk && ok;
    console.log(
      `${ok ? "✅" : "❌"} ${check.label}: expected=${check.expected} actual=${check.actual}`,
    );
  }

  const agentShareBps = await payments.agentShareBps();
  console.log(`Agent share bps: ${agentShareBps} (expected 8000 for 80%)`);

  if (!allOk) {
    throw new Error(
      "Configuration mismatch detected. Resolve before proceeding.",
    );
  }
  console.log(
    "\nAll configured treasury addresses match the deployment manifest.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
