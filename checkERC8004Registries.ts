import { ethers, network } from "hardhat";
import { assertERC8004Deployment, ERC8004_SOURCE_URL } from "./erc8004Config";

async function main() {
  if (network.name !== "celoSepolia" && network.name !== "celoMainnet") {
    throw new Error(
      "ERC-8004 verification supports only Celo Sepolia and Celo Mainnet.",
    );
  }

  const config = await assertERC8004Deployment(ethers.provider);
  console.log(`Network: ${config.network} (chainId ${config.chainId})`);
  console.log(`Official source: ${ERC8004_SOURCE_URL}`);
  console.log(`Identity Registry: ${config.identityRegistry}`);
  console.log(`Reputation Registry: ${config.reputationRegistry}`);
  console.log(`Validation Registry: ${config.validationRegistry}`);
  console.log(
    `EIP-1967 implementations: identity=${config.implementations.identityRegistry}, ` +
      `reputation=${config.implementations.reputationRegistry}, ` +
      `validation=${config.implementations.validationRegistry}`,
  );
  console.log(
    `Explorer source verification: identity=${config.sourceVerified.identityRegistry}, ` +
      `reputation=${config.sourceVerified.reputationRegistry}, ` +
      `validation=${config.sourceVerified.validationRegistry}`,
  );
  console.log(
    "Registry bytecode, ERC-721 support, and Identity Registry bindings verified read-only.",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
