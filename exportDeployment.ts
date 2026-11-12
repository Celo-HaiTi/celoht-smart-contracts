import * as fs from "fs";
import * as path from "path";
import { Interface, isAddress } from "ethers";
import * as prettier from "prettier";
import {
  ERC8004_ABIS,
  ERC8004_SOURCE_COMMIT,
  ERC8004_SOURCE_URL,
  getERC8004NetworkConfig,
} from "./erc8004Config";

/**
 * Exports the machine-readable deployment manifest(s) into a single
 * DApp-consumable config file, so the frontend never has to duplicate
 * contract addresses across multiple files by hand (SKILL section 37).
 */
async function main() {
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
    .filter(
      (f: string) =>
        f.endsWith(".json") &&
        f !== "dapp-config.json" &&
        f !== "erc8004.json" &&
        !f.endsWith("-erc8004-link.json"),
    );

  const config: Record<string, unknown> = {};
  for (const file of files) {
    const network = file.replace(/\.json$/, "");
    const manifest = JSON.parse(
      fs.readFileSync(path.join(deploymentsDir, file), "utf-8"),
    );
    for (const [, manifestKey] of contracts) {
      if (typeof manifest[manifestKey] !== "string") {
        throw new Error(
          `Deployment manifest ${file} is missing ${manifestKey} address.`,
        );
      }
    }
    const contractConfig = Object.fromEntries(
      contracts.map(([contractName, manifestKey]) => {
        const artifactPath = path.join(
          artifactsDir,
          `${contractName}.sol`,
          `${contractName}.json`,
        );
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        if (!Array.isArray(artifact.abi)) {
          throw new Error(`Artifact ${artifactPath} does not contain an ABI.`);
        }
        return [
          manifestKey,
          {
            address: manifest[manifestKey],
            abi: artifact.abi,
            abiReference: manifest.abiReferences?.[manifestKey] ?? artifactPath,
          },
        ];
      }),
    );
    const erc8004 = getERC8004NetworkConfig(Number(manifest.chainId));
    const erc8004ContractConfig = {
      identityRegistry: {
        address: erc8004.identityRegistry,
        sourceVerified: erc8004.sourceVerified.identityRegistry,
        abi: JSON.parse(new Interface(ERC8004_ABIS.identity).formatJson()),
        abiReference: "erc8004Config.ts#ERC8004_ABIS.identity",
        explorerUrl: `${erc8004.explorerUrl}/address/${erc8004.identityRegistry}`,
      },
      reputationRegistry: {
        address: erc8004.reputationRegistry,
        sourceVerified: erc8004.sourceVerified.reputationRegistry,
        abi: JSON.parse(new Interface(ERC8004_ABIS.reputation).formatJson()),
        abiReference: "erc8004Config.ts#ERC8004_ABIS.reputation",
        explorerUrl: `${erc8004.explorerUrl}/address/${erc8004.reputationRegistry}`,
      },
      validationRegistry: {
        address: erc8004.validationRegistry,
        sourceVerified: erc8004.sourceVerified.validationRegistry,
        abi: JSON.parse(new Interface(ERC8004_ABIS.validation).formatJson()),
        abiReference: "erc8004Config.ts#ERC8004_ABIS.validation",
        explorerUrl: `${erc8004.explorerUrl}/address/${erc8004.validationRegistry}`,
      },
    };

    const linkDeploymentPath = path.join(
      deploymentsDir,
      `${network}-erc8004-link.json`,
    );
    let identityLinkAddress: string | null = null;
    if (fs.existsSync(linkDeploymentPath)) {
      const linkDeployment = JSON.parse(
        fs.readFileSync(linkDeploymentPath, "utf-8"),
      ) as { chainId?: number; address?: string };
      if (
        linkDeployment.chainId !== Number(manifest.chainId) ||
        typeof linkDeployment.address !== "string" ||
        !isAddress(linkDeployment.address)
      ) {
        throw new Error(
          `Identity-link deployment record ${linkDeploymentPath} does not match ${network}.`,
        );
      }
      identityLinkAddress = linkDeployment.address;
    }

    const linkInterfaceName = "CeloHTERC8004IdentityLink";
    const linkArtifactPath = path.join(
      artifactsDir,
      `${linkInterfaceName}.sol`,
      `${linkInterfaceName}.json`,
    );
    const linkArtifact = JSON.parse(fs.readFileSync(linkArtifactPath, "utf-8"));
    if (!Array.isArray(linkArtifact.abi)) {
      throw new Error(`Artifact ${linkArtifactPath} does not contain an ABI.`);
    }

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
      contracts: {
        ...contractConfig,
        erc8004IdentityLink: {
          address: identityLinkAddress,
          deploymentStatus: identityLinkAddress ? "DEPLOYED" : "NOT DEPLOYED",
          abi: linkArtifact.abi,
          abiReference: linkArtifactPath,
          explorerUrl: identityLinkAddress
            ? `${erc8004.explorerUrl}/address/${identityLinkAddress}`
            : null,
        },
      },
      erc8004: {
        sourceRepository: "https://github.com/erc-8004/erc-8004-contracts",
        sourceCommit: ERC8004_SOURCE_COMMIT,
        sourceUrl: ERC8004_SOURCE_URL,
        chainId: Number(erc8004.chainId),
        contracts: erc8004ContractConfig,
      },
    };
  }

  const formattedConfig = await prettier.format(JSON.stringify(config), {
    parser: "json",
  });
  fs.writeFileSync(outFile, formattedConfig);
  console.log(`DApp config exported to ${outFile}`);
  console.log(
    `Networks included: ${Object.keys(config).join(", ") || "(none — no manifests found yet)"}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
