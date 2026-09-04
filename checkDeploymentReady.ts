import { ethers, network } from "hardhat";
import { loadDeploymentConfig } from "./deployConfig";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const cfg = loadDeploymentConfig(network.name);

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} CELO`);
  console.log(`USDm: ${cfg.usdm}`);
  console.log(`Treasury: ${cfg.generalTreasury}`);

  if (
    network.name !== "celoSepolia" &&
    network.name !== "alfajores" &&
    network.name !== "celo"
  ) {
    console.warn(
      "Local or non-production network detected; deployment is not live-network ready.",
    );
    return;
  }

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has zero CELO balance on the target network. Fund the wallet before deployment.",
    );
  }

  if (
    !cfg.usdm ||
    !cfg.generalTreasury ||
    !cfg.educationTreasury ||
    !cfg.reforestationTreasury ||
    !cfg.governanceTreasury
  ) {
    throw new Error(
      "One or more deployment addresses are missing. Fill in .env and rerun the check.",
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
