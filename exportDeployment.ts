import * as fs from "fs";
import * as path from "path";

/**
 * Exports the machine-readable deployment manifest(s) into a single
 * DApp-consumable config file, so the frontend never has to duplicate
 * contract addresses across multiple files by hand (SKILL section 37).
 */
function main() {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const outFile = path.join(deploymentsDir, "dapp-config.json");

  const files = fs
    .readdirSync(deploymentsDir)
    .filter((f: string) => f.endsWith(".json") && f !== "dapp-config.json");

  const config: Record<string, unknown> = {};
  for (const file of files) {
    const network = file.replace(/^celo-/, "").replace(/\.json$/, "");
    config[network] = JSON.parse(fs.readFileSync(path.join(deploymentsDir, file), "utf-8"));
  }

  fs.writeFileSync(outFile, JSON.stringify(config, null, 2));
  console.log(`DApp config exported to ${outFile}`);
  console.log(`Networks included: ${Object.keys(config).join(", ") || "(none — no manifests found yet)"}`);
}

main();
