import { expect } from "chai";
import { Contract, Log, LogDescription, TransactionReceipt } from "ethers";
import { ethers } from "hardhat";
import { ERC8004_ABIS, ERC8004_NETWORKS } from "../erc8004Config";

describe("ERC-8004 Sepolia implementation (local fork)", function () {
  const uri = "https://example.invalid/erc8004/test-agent.json";
  let identity: Contract;
  let reputation: Contract;
  let validation: Contract;
  let owner: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  let operator: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  let reviewer: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  let validator: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  let stranger: Awaited<ReturnType<typeof ethers.getSigners>>[number];

  before(async () => {
    const signers = await ethers.getSigners();
    [owner, operator, reviewer, validator, stranger] = signers;
    const config = ERC8004_NETWORKS.celoSepolia;
    identity = new Contract(
      config.identityRegistry,
      ERC8004_ABIS.identity,
      owner,
    );
    reputation = new Contract(
      config.reputationRegistry,
      ERC8004_ABIS.reputation,
      owner,
    );
    validation = new Contract(
      config.validationRegistry,
      ERC8004_ABIS.validation,
      owner,
    );
  });

  async function registerAgent(agentURI = uri): Promise<bigint> {
    const transaction =
      await identity.getFunction("register(string)")(agentURI);
    const receipt: TransactionReceipt | null = await transaction.wait();
    if (!receipt) {
      throw new Error("Identity registration receipt was not mined.");
    }

    const registered = receipt.logs
      .map((log: Log) => identity.interface.parseLog(log))
      .find((event: LogDescription | null) => event?.name === "Registered");
    if (!registered) {
      throw new Error("Identity registration did not emit Registered.");
    }
    return BigInt(registered.args.agentId);
  }

  it("registers an ERC-721 identity, enforces metadata authorization, verifies a wallet, and clears stale wallet state on transfer", async () => {
    const agentId = await registerAgent();
    const identityAddress = await identity.getAddress();

    expect(await identity.ownerOf(agentId)).to.equal(owner.address);
    expect(await identity.balanceOf(owner.address)).to.be.greaterThan(0n);
    expect(await identity.tokenURI(agentId)).to.equal(uri);
    expect(await identity.getAgentWallet(agentId)).to.equal(owner.address);
    await expect(identity.ownerOf(agentId + 999999n)).to.be.reverted;

    await expect(
      identity.connect(stranger).getFunction("setAgentURI(uint256,string)")(
        agentId,
        "https://example.invalid/unauthorized",
      ),
    ).to.be.revertedWith("Not authorized");
    await identity.connect(owner).getFunction("approve(address,uint256)")(
      operator.address,
      agentId,
    );
    await identity.connect(operator).getFunction("setAgentURI(uint256,string)")(
      agentId,
      `${uri}?updated=1`,
    );
    expect(await identity.tokenURI(agentId)).to.equal(`${uri}?updated=1`);

    const metadata = identity.getFunction("register(string,(string,bytes)[])");
    await expect(
      metadata(uri, [{ metadataKey: "agentWallet", metadataValue: "0x" }]),
    ).to.be.revertedWith("reserved key");

    await identity
      .connect(owner)
      .getFunction("setMetadata(uint256,string,bytes)")(
      agentId,
      "profile",
      ethers.toUtf8Bytes("verified"),
    );
    expect(
      ethers.toUtf8String(await identity.getMetadata(agentId, "profile")),
    ).to.equal("verified");
    await expect(
      identity
        .connect(stranger)
        .getFunction("setMetadata(uint256,string,bytes)")(
        agentId,
        "profile",
        "0x",
      ),
    ).to.be.revertedWith("Not authorized");
    await expect(
      identity.connect(owner).getFunction("setMetadata(uint256,string,bytes)")(
        agentId,
        "agentWallet",
        "0x",
      ),
    ).to.be.revertedWith("reserved key");

    const latestBlock = await ethers.provider.getBlock("latest");
    if (!latestBlock) {
      throw new Error("Latest fork block is unavailable.");
    }
    const deadline = BigInt(latestBlock.timestamp + 240);
    await expect(
      identity
        .connect(owner)
        .getFunction("setAgentWallet(uint256,address,uint256,bytes)")(
        agentId,
        ethers.ZeroAddress,
        deadline,
        "0x",
      ),
    ).to.be.revertedWith("bad wallet");
    await expect(
      identity
        .connect(owner)
        .getFunction("setAgentWallet(uint256,address,uint256,bytes)")(
        agentId,
        reviewer.address,
        BigInt(latestBlock.timestamp - 1),
        "0x",
      ),
    ).to.be.revertedWith("expired");
    const forkChainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
      name: "ERC8004IdentityRegistry",
      version: "1",
      chainId: forkChainId,
      verifyingContract: identityAddress,
    };
    const types = {
      AgentWalletSet: [
        { name: "agentId", type: "uint256" },
        { name: "newWallet", type: "address" },
        { name: "owner", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = {
      agentId,
      newWallet: reviewer.address,
      owner: owner.address,
      deadline,
    };
    const invalidSignature = await stranger.signTypedData(domain, types, value);
    await expect(
      identity
        .connect(owner)
        .getFunction("setAgentWallet(uint256,address,uint256,bytes)")(
        agentId,
        reviewer.address,
        deadline,
        invalidSignature,
      ),
    ).to.be.revertedWith("invalid wallet sig");

    const validSignature = await reviewer.signTypedData(domain, types, value);
    await identity
      .connect(owner)
      .getFunction("setAgentWallet(uint256,address,uint256,bytes)")(
      agentId,
      reviewer.address,
      deadline,
      validSignature,
    );
    expect(await identity.getAgentWallet(agentId)).to.equal(reviewer.address);
    await expect(
      identity.connect(stranger).getFunction("unsetAgentWallet(uint256)")(
        agentId,
      ),
    ).to.be.revertedWith("Not authorized");
    await identity.connect(owner).getFunction("unsetAgentWallet(uint256)")(
      agentId,
    );
    expect(await identity.getAgentWallet(agentId)).to.equal(ethers.ZeroAddress);

    await identity
      .connect(owner)
      .getFunction("transferFrom(address,address,uint256)")(
      owner.address,
      operator.address,
      agentId,
    );
    expect(await identity.ownerOf(agentId)).to.equal(operator.address);
    expect(await identity.getAgentWallet(agentId)).to.equal(ethers.ZeroAddress);
    await expect(
      identity.connect(owner).getFunction("setAgentURI(uint256,string)")(
        agentId,
        uri,
      ),
    ).to.be.revertedWith("Not authorized");
    await identity.connect(operator).getFunction("setAgentURI(uint256,string)")(
      agentId,
      uri,
    );
  });

  it("submits, reads, summarizes, responds to, and revokes reputation feedback", async () => {
    const agentId = await registerAgent();
    const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes("feedback"));
    const feedback = reputation
      .connect(reviewer)
      .getFunction(
        "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
      );
    await expect(
      feedback(agentId, 85, 0, "quality", "", "", "", ethers.ZeroHash),
    ).to.emit(reputation, "NewFeedback");

    await expect(
      feedback(agentId, 85, 19, "quality", "", "", "", ethers.ZeroHash),
    ).to.be.revertedWith("too many decimals");
    await expect(
      reputation
        .connect(owner)
        .getFunction(
          "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
        )(agentId, 85, 0, "quality", "", "", "", ethers.ZeroHash),
    ).to.be.revertedWith("Self-feedback not allowed");

    expect(await reputation.getLastIndex(agentId, reviewer.address)).to.equal(
      1,
    );
    expect(await reputation.getClients(agentId)).to.deep.equal([
      reviewer.address,
    ]);
    expect(
      await reputation.readFeedback(agentId, reviewer.address, 1),
    ).to.deep.equal([85n, 0n, "quality", "", false]);
    const summary = await reputation.getSummary(
      agentId,
      [reviewer.address],
      "quality",
      "",
    );
    expect(summary).to.deep.equal([1n, 85n, 0n]);
    const allFeedback = await reputation.readAllFeedback(
      agentId,
      [],
      "",
      "",
      false,
    );
    expect(allFeedback.clients).to.deep.equal([reviewer.address]);
    expect(allFeedback.feedbackIndexes).to.deep.equal([1n]);
    expect(allFeedback[2]).to.deep.equal([85n]);

    await expect(
      reputation
        .connect(stranger)
        .getFunction("revokeFeedback(uint256,uint64)")(agentId, 1),
    ).to.be.revertedWith("index out of bounds");
    await expect(
      reputation
        .connect(reviewer)
        .getFunction("revokeFeedback(uint256,uint64)")(agentId, 0),
    ).to.be.revertedWith("index must be > 0");
    await expect(
      reputation.readFeedback(agentId, reviewer.address, 0),
    ).to.be.revertedWith("index must be > 0");
    await expect(
      reputation
        .connect(stranger)
        .getFunction("appendResponse(uint256,address,uint64,string,bytes32)")(
        agentId,
        reviewer.address,
        1,
        "",
        feedbackHash,
      ),
    ).to.be.revertedWith("Empty URI");
    await expect(
      reputation
        .connect(owner)
        .getFunction("appendResponse(uint256,address,uint64,string,bytes32)")(
        agentId,
        reviewer.address,
        1,
        uri,
        feedbackHash,
      ),
    )
      .to.emit(reputation, "ResponseAppended")
      .withArgs(agentId, reviewer.address, 1, owner.address, uri, feedbackHash);
    expect(
      await reputation.getResponseCount(agentId, reviewer.address, 1, [
        owner.address,
      ]),
    ).to.equal(1);

    await expect(
      reputation
        .connect(reviewer)
        .getFunction("revokeFeedback(uint256,uint64)")(agentId, 1),
    )
      .to.emit(reputation, "FeedbackRevoked")
      .withArgs(agentId, reviewer.address, 1);
    expect(
      (await reputation.readFeedback(agentId, reviewer.address, 1)).isRevoked,
    ).to.equal(true);
    expect(
      await reputation
        .readAllFeedback(agentId, [], "", "", false)
        .then((items) => items.feedbackIndexes),
    ).to.deep.equal([]);
    expect(
      (await reputation.readAllFeedback(agentId, [], "", "", true))
        .revokedStatuses,
    ).to.deep.equal([true]);
    expect(
      await reputation.getSummary(agentId, [reviewer.address], "", ""),
    ).to.deep.equal([0n, 0n, 0n]);
    await expect(
      reputation
        .connect(reviewer)
        .getFunction("revokeFeedback(uint256,uint64)")(agentId, 1),
    ).to.be.revertedWith("Already revoked");
  });

  it("authorizes validation requests and validator responses and exposes status, summary, and history", async () => {
    const agentId = await registerAgent();
    const requestHash = ethers.keccak256(
      ethers.toUtf8Bytes("validation request"),
    );
    const responseHash = ethers.keccak256(
      ethers.toUtf8Bytes("validation response"),
    );

    await expect(
      validation
        .connect(stranger)
        .getFunction("validationRequest(address,uint256,string,bytes32)")(
        validator.address,
        agentId,
        uri,
        requestHash,
      ),
    ).to.be.revertedWith("Not authorized");
    await expect(
      validation
        .connect(owner)
        .getFunction("validationRequest(address,uint256,string,bytes32)")(
        ethers.ZeroAddress,
        agentId,
        uri,
        requestHash,
      ),
    ).to.be.revertedWith("bad validator");
    await expect(
      validation
        .connect(owner)
        .getFunction("validationRequest(address,uint256,string,bytes32)")(
        validator.address,
        agentId + 999999n,
        uri,
        requestHash,
      ),
    ).to.be.reverted;
    await expect(
      validation
        .connect(owner)
        .getFunction("validationRequest(address,uint256,string,bytes32)")(
        validator.address,
        agentId,
        uri,
        requestHash,
      ),
    )
      .to.emit(validation, "ValidationRequest")
      .withArgs(validator.address, agentId, uri, requestHash);

    expect(await validation.getAgentValidations(agentId)).to.deep.equal([
      requestHash,
    ]);
    expect(await validation.getValidatorRequests(validator.address)).to.include(
      requestHash,
    );
    await expect(
      validation
        .connect(owner)
        .getFunction("validationRequest(address,uint256,string,bytes32)")(
        validator.address,
        agentId,
        uri,
        requestHash,
      ),
    ).to.be.revertedWith("exists");
    await expect(
      validation.getValidationStatus(ethers.ZeroHash),
    ).to.be.revertedWith("unknown");
    await expect(
      validation
        .connect(stranger)
        .getFunction("validationResponse(bytes32,uint8,string,bytes32,string)")(
        requestHash,
        100,
        uri,
        responseHash,
        "approved",
      ),
    ).to.be.revertedWith("not validator");
    await expect(
      validation
        .connect(validator)
        .getFunction("validationResponse(bytes32,uint8,string,bytes32,string)")(
        requestHash,
        101,
        uri,
        responseHash,
        "approved",
      ),
    ).to.be.revertedWith("resp>100");

    await expect(
      validation
        .connect(validator)
        .getFunction("validationResponse(bytes32,uint8,string,bytes32,string)")(
        requestHash,
        95,
        uri,
        responseHash,
        "approved",
      ),
    )
      .to.emit(validation, "ValidationResponse")
      .withArgs(
        validator.address,
        agentId,
        requestHash,
        95,
        uri,
        responseHash,
        "approved",
      );
    const status = await validation.getValidationStatus(requestHash);
    expect(status.validatorAddress).to.equal(validator.address);
    expect(status.agentId).to.equal(agentId);
    expect(status.response).to.equal(95);
    expect(status.responseHash).to.equal(responseHash);
    expect(status.tag).to.equal("approved");
    expect(status.lastUpdate).to.be.greaterThan(0n);
    expect(
      await validation.getSummary(agentId, [validator.address], "approved"),
    ).to.deep.equal([1n, 95n]);

    await validation
      .connect(validator)
      .getFunction("validationResponse(bytes32,uint8,string,bytes32,string)")(
      requestHash,
      100,
      uri,
      responseHash,
      "final",
    );
    expect(
      (await validation.getValidationStatus(requestHash)).response,
    ).to.equal(100);
    expect(await validation.getSummary(agentId, [], "final")).to.deep.equal([
      1n,
      100n,
    ]);
  });
});
