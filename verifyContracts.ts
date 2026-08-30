import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Submits source-code verification for every deployed contract to the
 * appropriate Celo block explorer (Celoscan), using hardhat-toolbox's
 * verify plugin. Only reports "VERIFIED" if the plugin actually confirms
 * success; otherwise reports "NOT VERIFIED" with the underlying error.
 * Never fabricates a verification result.
 */
async function verifyOne(label: string, address: string, constructorArguments: unknown[]) {
  try {
    await run("verify:verify", { address, constructorArguments });
    console.log(`✅ VERIFIED: ${label} (${address})`);
    return true;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("already verified")) {
      console.log(`✅ VERIFIED (already): ${label} (${address})`);
      return true;
    }
    console.error(`❌ NOT VERIFIED: ${label} (${address}) — ${err?.message ?? err}`);
    return false;
  }
}

async function main() {
  const manifestFile = network.name === "celo" ? "celo-mainnet.json" : `celo-${network.name}.json`;
  const manifestPath = path.join(__dirname, "..", "deployments", manifestFile);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No deployment manifest found at ${manifestPath}. Run deployAll.ts first.`);
  }
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  const FEES = {
    registration: 200000000000000000n,
    p2p: 10000000000000000n,
    education: 20000000000000000n,
    certificate: 10000000000000000n,
    vote: 10000000000000000n,
  };

  const results: boolean[] = [];
  results.push(
    await verifyOne("CeloHTAgentRegistry", m.agentRegistry, [
      m.usdm,
      m.generalTreasury,
      FEES.registration,
      m.deployer,
    ])
  );
  results.push(
    await verifyOne("CeloHTServicePayments", m.servicePayments, [
      m.usdm,
      m.agentRegistry,
      m.generalTreasury,
      m.deployer,
      FEES.p2p,
      FEES.education,
    ])
  );
  results.push(
    await verifyOne("CeloHTEducation", m.education, [m.usdm, m.educationTreasury, FEES.certificate, m.deployer])
  );
  results.push(
    await verifyOne("CeloHTReforestation", m.reforestation, [m.usdm, m.reforestationTreasury, m.deployer])
  );
  results.push(
    await verifyOne("CeloHTGovernance", m.governance, [m.usdm, m.governanceTreasury, FEES.vote, m.deployer])
  );

  m.verification = results.every(Boolean) ? "VERIFIED" : "NOT VERIFIED";
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
  console.log(`\nManifest verification field updated to: ${m.verification}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
