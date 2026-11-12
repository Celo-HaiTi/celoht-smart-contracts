import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import {
  assertERC8004Deployment,
  ERC8004_SOURCE_COMMIT,
} from "./erc8004Config";

async function main() {
  if (network.name !== "celoSepolia") {
    throw new Error(
      "Refusing deployment: the CeloHT ERC-8004 identity link is Sepolia-only.",
    );
  }

  const config = await assertERC8004Deployment(ethers.provider);
  if (config.chainId !== 11142220n) {
    throw new Error(
      `Refusing deployment on unexpected chain ID ${config.chainId}.`,
    );
  }

  const celoHTManifestPath = path.join(
    __dirname,
    "deployments",
    "celoSepolia.json",
  );
  if (!fs.existsSync(celoHTManifestPath)) {
    throw new Error(
      `Missing existing CeloHT Sepolia manifest: ${celoHTManifestPath}.`,
    );
  }

  const celoHTManifest = JSON.parse(
    fs.readFileSync(celoHTManifestPath, "utf8"),
  ) as { chainId?: number; agentRegistry?: string };
  if (
    celoHTManifest.chainId !== 11142220 ||
    typeof celoHTManifest.agentRegistry !== "string" ||
    !ethers.isAddress(celoHTManifest.agentRegistry)
  ) {
    throw new Error("Existing CeloHT Sepolia manifest is invalid.");
  }
  const celoHTRegistry = celoHTManifest.agentRegistry;
  if ((await ethers.provider.getCode(celoHTRegistry)) === "0x") {
    throw new Error(`No CeloHT Agent Registry bytecode at ${celoHTRegistry}.`);
  }

  const outFile = path.join(
    __dirname,
    "deployments",
    "celoSepolia-erc8004-link.json",
  );
  if (fs.existsSync(outFile)) {
    throw new Error(
      `Refusing to overwrite existing identity-link deployment record at ${outFile}.`,
    );
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No Sepolia transaction signer is configured.");
  }

  const Link = await ethers.getContractFactory("CeloHTERC8004IdentityLink");
  const link = await Link.deploy(celoHTRegistry, config.identityRegistry);
  const transaction = link.deploymentTransaction();
  if (!transaction) {
    throw new Error("Identity-link deployment transaction is unavailable.");
  }
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error("Identity-link deployment transaction did not succeed.");
  }
  const address = await link.getAddress();

  const manifest = {
    network: config.network,
    chainId: Number(config.chainId),
    contract: "CeloHTERC8004IdentityLink",
    address,
    celoHTAgentRegistry: celoHTRegistry,
    identityRegistry: config.identityRegistry,
    reputationRegistry: config.reputationRegistry,
    validationRegistry: config.validationRegistry,
    sourceRepository: "https://github.com/erc-8004/erc-8004-contracts",
    sourceCommit: ERC8004_SOURCE_COMMIT,
    deploymentTransactionHash: transaction.hash,
    deploymentBlock: receipt.blockNumber,
    deployer: deployer.address,
    explorerUrl: `${config.explorerUrl}/address/${address}`,
  };
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`CeloHT ERC-8004 identity link deployed at ${address}`);
  console.log(`Transaction: ${transaction.hash}`);
  console.log(`Deployment record: ${outFile}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
