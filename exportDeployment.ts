import * as fs from "fs";
import * as path from "path";

/**
 * Exports the machine-readable deployment manifest(s) into a single
 * DApp-consumable config file, so the frontend never has to duplicate
 * contract addresses across multiple files by hand (SKILL section 37).
 */
function main() {
  const deploymentsDir = path.join(__dirname, "deployments");
  const artifactsDir = path.join(__dirname, "artifacts", "contracts");
  const outFile = path.join(deploymentsDir, "dapp-config.json");

  const contracts = [
    ["CeloHTAgentRegistry", "agentRegistry"],
    ["CeloHTServicePayments", "servicePayments"],
    ["CeloHTEducation", "education"],
    ["CeloHTReforestation", "reforestation"],
    ["CeloHTGovernance", "governance"],
  ] as const;

  const files = fs
    .readdirSync(deploymentsDir)
    .filter((f: string) => f.endsWith(".json") && f !== "dapp-config.json");

  const config: Record<string, unknown> = {};
  for (const file of files) {
    const network = file.replace(/\.json$/, "");
    const manifest = JSON.parse(
      fs.readFileSync(path.join(deploymentsDir, file), "utf-8"),
    );
    const contractConfig = Object.fromEntries(
      contracts.map(([contractName, manifestKey]) => {
        const artifactPath = path.join(
          artifactsDir,
          `${contractName}.sol`,
          `${contractName}.json`,
        );
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        return [
          manifestKey,
          { address: manifest[manifestKey], abi: artifact.abi },
        ];
      }),
    );

    config[network] = {
      ...manifest,
      rpcUrl:
        network === "celoSepolia"
          ? "https://forno.celo-sepolia.celo-testnet.org"
          : null,
      explorerUrl:
        network === "celoSepolia"
          ? "https://celo-sepolia.blockscout.com"
          : null,
      contracts: contractConfig,
    };
  }

  fs.writeFileSync(outFile, JSON.stringify(config, null, 2));
  console.log(`DApp config exported to ${outFile}`);
  console.log(
    `Networks included: ${Object.keys(config).join(", ") || "(none — no manifests found yet)"}`,
  );
}

main();
