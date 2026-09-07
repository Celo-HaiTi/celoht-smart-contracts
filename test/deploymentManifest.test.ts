import { expect } from "chai";
import { isAddress } from "ethers";
import * as fs from "fs";
import * as path from "path";

const deploymentsDir = path.join(__dirname, "..", "deployments");
const manifest = JSON.parse(
  fs.readFileSync(path.join(deploymentsDir, "celoSepolia.json"), "utf8"),
);
const dappConfig = JSON.parse(
  fs.readFileSync(path.join(deploymentsDir, "dapp-config.json"), "utf8"),
).celoSepolia;

const contractKeys = [
  "agentRegistry",
  "servicePayments",
  "education",
  "reforestation",
  "governance",
] as const;

describe("deployment manifest compatibility", () => {
  it("records canonical network, addresses, blocks, transactions, and ABIs", () => {
    expect(manifest.network).to.equal("celoSepolia");
    expect(manifest.chainId).to.equal(11142220);
    expect(isAddress(manifest.protocolAdmin)).to.equal(true);
    expect(manifest.verificationStatus).to.be.oneOf([
      "VERIFIED",
      "NOT VERIFIED",
    ]);

    for (const key of contractKeys) {
      expect(isAddress(manifest[key]), `${key} address`).to.equal(true);
      expect(manifest.deploymentBlocks[key], `${key} block`).to.be.a("number");
      expect(manifest.transactionHashes[key], `${key} transaction`).to.match(
        /^0x[0-9a-fA-F]{64}$/,
      );
      expect(manifest.abiReferences[key], `${key} ABI reference`).to.be.a(
        "string",
      );
      expect(
        fs.existsSync(path.join(__dirname, "..", manifest.abiReferences[key])),
        `${key} ABI artifact`,
      ).to.equal(true);
    }
  });

  it("exports the same addresses with consumable ABI arrays", () => {
    expect(dappConfig.chainId).to.equal(manifest.chainId);
    for (const key of contractKeys) {
      expect(dappConfig.contracts[key].address).to.equal(manifest[key]);
      expect(dappConfig.contracts[key].abi).to.be.an("array").that.is.not.empty;
      expect(dappConfig.contracts[key].abiReference).to.equal(
        manifest.abiReferences[key],
      );
    }
  });
});
