import { ethers, network } from "hardhat";
import { loadDeploymentConfig } from "./deployConfig";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const cfg = loadDeploymentConfig(network.name);
  const expectedChainId = 11142220n;

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} CELO`);
  console.log(`USDm: ${cfg.usdm}`);
  console.log(`Treasury: ${cfg.generalTreasury}`);

  if (network.name !== "celoSepolia") {
    throw new Error("Deployment readiness requires the celoSepolia network.");
  }

  const actualChainId = (await ethers.provider.getNetwork()).chainId;
  if (actualChainId !== expectedChainId) {
    throw new Error(
      `Wrong chain ID: expected ${expectedChainId}, got ${actualChainId}.`,
    );
  }

  const minimumBalance = ethers.parseEther("0.01");
  if (balance < minimumBalance) {
    throw new Error(
      `Insufficient deployer CELO balance: ${ethers.formatEther(balance)} CELO. ` +
        `At least ${ethers.formatEther(minimumBalance)} CELO is required.`,
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

  const tokenCode = await ethers.provider.getCode(cfg.usdm);
  if (tokenCode === "0x") {
    throw new Error(
      `USDm address ${cfg.usdm} has no contract bytecode on ${network.name}.`,
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
      `Unexpected USDm metadata on ${network.name}: symbol=${symbol}, decimals=${decimals}.`,
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
