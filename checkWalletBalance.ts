import { ethers, network } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = signer.address;
  const balance = await ethers.provider.getBalance(address);
  if (network.name !== "celoSepolia") {
    throw new Error("Wallet validation requires the celoSepolia network.");
  }
  const nativeSymbol = "CELO";

  console.log("=== Wallet balance check ===");
  console.log(`Network: ${network.name}`);
  console.log(`Address: ${address}`);
  console.log(`Native token: ${nativeSymbol}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ${nativeSymbol}`);

  const minRequired = ethers.parseEther("0.01");
  console.log(
    `Recommended minimum for deploy: ${ethers.formatEther(minRequired)} ${nativeSymbol}`,
  );

  if (balance < minRequired) {
    console.error(
      `WARNING: balance is below the recommended minimum for deployment. ` +
        `Fund this wallet before attempting a live deploy on ${network.name}.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "Wallet balance check passed: sufficient funds for a deployment attempt.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
