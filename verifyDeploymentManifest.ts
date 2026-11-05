import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const EXPECTED_CHAIN_ID = 11142220n;
const CONTRACT_KEYS = [
  "agentRegistry",
  "servicePayments",
  "education",
  "reforestation",
  "governance",
] as const;
const BLOCKSCOUT_API =
  "https://celo-sepolia.blockscout.com/api/v2/transactions";

type DeploymentManifest = {
  network: string;
  chainId: number;
  deploymentBlocks: Record<(typeof CONTRACT_KEYS)[number], number>;
  transactionHashes: Record<(typeof CONTRACT_KEYS)[number], string>;
} & Record<(typeof CONTRACT_KEYS)[number], string>;

interface DeploymentReceipt {
  success: boolean;
  contractAddress: string | null;
  blockNumber: number;
  source: "RPC" | "Blockscout";
}

interface BlockscoutTransaction {
  hash?: string;
  status?: string;
  result?: string;
  block_number?: number;
  created_contract?: { hash?: string } | null;
}

async function getDeploymentReceipt(
  transactionHash: string,
): Promise<DeploymentReceipt> {
  const receipt = await ethers.provider.getTransactionReceipt(transactionHash);
  if (receipt) {
    return {
      success: receipt.status === 1,
      contractAddress: receipt.contractAddress,
      blockNumber: receipt.blockNumber,
      source: "RPC",
    };
  }

  const response = await fetch(`${BLOCKSCOUT_API}/${transactionHash}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(
      `Blockscout could not retrieve transaction ${transactionHash}: HTTP ${response.status}.`,
    );
  }
  const transaction = (await response.json()) as BlockscoutTransaction;
  if (transaction.hash?.toLowerCase() !== transactionHash.toLowerCase()) {
    throw new Error(`Blockscout returned a different transaction hash.`);
  }

  return {
    success: transaction.status === "ok" && transaction.result === "success",
    contractAddress: transaction.created_contract?.hash ?? null,
    blockNumber: transaction.block_number ?? -1,
    source: "Blockscout",
  };
}

async function main() {
  if (network.name !== "celoSepolia") {
    throw new Error("Manifest verification requires the celoSepolia network.");
  }

  const manifestPath = path.join(
    __dirname,
    "deployments",
    `${network.name}.json`,
  );
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as DeploymentManifest;

  if (
    manifest.network !== network.name ||
    manifest.chainId !== Number(EXPECTED_CHAIN_ID)
  ) {
    throw new Error(
      `Manifest network mismatch: expected ${network.name} (${EXPECTED_CHAIN_ID}).`,
    );
  }

  const actualChainId = (await ethers.provider.getNetwork()).chainId;
  if (actualChainId !== EXPECTED_CHAIN_ID) {
    throw new Error(
      `Wrong RPC chain ID: expected ${EXPECTED_CHAIN_ID}, got ${actualChainId}.`,
    );
  }

  for (const key of CONTRACT_KEYS) {
    const address = manifest[key];
    const transactionHash = manifest.transactionHashes[key];
    const deploymentBlock = manifest.deploymentBlocks[key];

    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid ${key} address in deployment manifest.`);
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
      throw new Error(
        `Invalid ${key} transaction hash in deployment manifest.`,
      );
    }
    if (!Number.isSafeInteger(deploymentBlock) || deploymentBlock < 0) {
      throw new Error(
        `Invalid ${key} deployment block in deployment manifest.`,
      );
    }

    const [code, receipt] = await Promise.all([
      ethers.provider.getCode(address),
      getDeploymentReceipt(transactionHash),
    ]);
    if (code === "0x") {
      throw new Error(`No contract bytecode found for ${key} at ${address}.`);
    }
    if (!receipt.success) {
      throw new Error(`No successful deployment receipt found for ${key}.`);
    }
    if (
      !receipt.contractAddress ||
      ethers.getAddress(receipt.contractAddress) !== ethers.getAddress(address)
    ) {
      throw new Error(
        `${key} deployment receipt address does not match the manifest.`,
      );
    }
    if (receipt.blockNumber !== deploymentBlock) {
      throw new Error(
        `${key} deployment block mismatch: manifest says ${deploymentBlock}, RPC says ${receipt.blockNumber}.`,
      );
    }

    console.log(
      `✓ ${key}: ${address} deployed in block ${receipt.blockNumber} (${receipt.source})`,
    );
  }

  console.log(
    "Manifest matches successful Celo Sepolia deployment receipts and deployed bytecode.",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
