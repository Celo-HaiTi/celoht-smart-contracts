import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployMockUSDm, fundAndApprove, FEES } from "./fixtures";

const VoteOption = { NONE: 0, YES: 1, NO: 2, ABSTAIN: 3 };

describe("CeloHTGovernance", () => {
  async function deployFixture() {
    const [admin, treasury, voter1, voter2, voter3, outsider] = await ethers.getSigners();
    const usdm = await deployMockUSDm();

    const Governance = await ethers.getContractFactory("CeloHTGovernance");
    const governance = await Governance.deploy(
      await usdm.getAddress(),
      treasury.address,
      FEES.vote,
      admin.address
    );

    const now = await time.latest();
    const startTime = now + 60;
    const endTime = now + 3600;

    return { admin, treasury, voter1, voter2, voter3, outsider, usdm, governance, startTime, endTime };
  }

  it("only an authorized proposer can create a proposal", async () => {
    const { outsider, governance, startTime, endTime } = await loadFixture(deployFixture);
    await expect(
      governance.connect(outsider).createProposal(ethers.id("proposal"), "ipfs://p1", startTime, endTime)
    ).to.be.reverted;
  });

  it("rejects an invalid voting window", async () => {
    const { admin, governance } = await loadFixture(deployFixture);
    const now = await time.latest();
    await expect(
      governance.connect(admin).createProposal(ethers.id("p"), "ipfs://p", now + 100, now + 50)
    ).to.be.revertedWithCustomError(governance, "InvalidWindow");
  });

  it("enforces exactly one vote per wallet per proposal", async () => {
    const { admin, voter1, usdm, governance, startTime, endTime } = await loadFixture(deployFixture);
    await governance.connect(admin).createProposal(ethers.id("p1"), "ipfs://p1", startTime, endTime);
    await fundAndApprove(usdm, voter1, await governance.getAddress(), FEES.vote * 2n);

    await time.increaseTo(startTime + 1);
    await governance.connect(voter1).vote(1, VoteOption.YES);

    await expect(governance.connect(voter1).vote(1, VoteOption.NO)).to.be.revertedWithCustomError(
      governance,
      "AlreadyVoted"
    );
  });

  it("voting power is always exactly one vote regardless of the fee paid", async () => {
    const { admin, voter1, voter2, usdm, governance, startTime, endTime } = await loadFixture(deployFixture);
    await governance.connect(admin).createProposal(ethers.id("p1"), "ipfs://p1", startTime, endTime);
    await fundAndApprove(usdm, voter1, await governance.getAddress(), FEES.vote);
    await fundAndApprove(usdm, voter2, await governance.getAddress(), FEES.vote);

    await time.increaseTo(startTime + 1);
    await governance.connect(voter1).vote(1, VoteOption.YES);
    await governance.connect(voter2).vote(1, VoteOption.YES);

    const proposal = await governance.getProposal(1);
    // Two distinct wallets paying the identical fixed fee => exactly 2 YES
    // votes. There is no path in `vote()` that accepts a variable amount
    // or multiplies vote weight by payment size.
    expect(proposal.yesVotes).to.equal(2);
  });

  it("rejects voting before the start time and after the end time", async () => {
    const { admin, voter1, usdm, governance, startTime, endTime } = await loadFixture(deployFixture);
    await governance.connect(admin).createProposal(ethers.id("p1"), "ipfs://p1", startTime, endTime);
    await fundAndApprove(usdm, voter1, await governance.getAddress(), FEES.vote * 2n);

    await expect(governance.connect(voter1).vote(1, VoteOption.YES)).to.be.revertedWithCustomError(
      governance,
      "VotingNotStarted"
    );

    await time.increaseTo(endTime + 10);
    await expect(governance.connect(voter1).vote(1, VoteOption.YES)).to.be.revertedWithCustomError(
      governance,
      "VotingEnded"
    );
  });

  it("counts YES, NO, and ABSTAIN correctly and finalizes only after the window closes", async () => {
    const { admin, voter1, voter2, voter3, usdm, governance, startTime, endTime } = await loadFixture(
      deployFixture
    );
    await governance.connect(admin).createProposal(ethers.id("p1"), "ipfs://p1", startTime, endTime);
    for (const v of [voter1, voter2, voter3]) {
      await fundAndApprove(usdm, v, await governance.getAddress(), FEES.vote);
    }

    await time.increaseTo(startTime + 1);
    await governance.connect(voter1).vote(1, VoteOption.YES);
    await governance.connect(voter2).vote(1, VoteOption.NO);
    await governance.connect(voter3).vote(1, VoteOption.ABSTAIN);

    await expect(governance.finalizeProposal(1)).to.be.revertedWithCustomError(governance, "VotingNotEnded");

    await time.increaseTo(endTime + 1);
    await expect(governance.finalizeProposal(1))
      .to.emit(governance, "ProposalFinalized")
      .withArgs(1, 1, 1, 1);

    await expect(governance.finalizeProposal(1)).to.be.revertedWithCustomError(governance, "AlreadyFinalized");
  });

  it("rejects an incomplete USDm allowance for the participation fee", async () => {
    const { admin, voter1, governance, startTime, endTime } = await loadFixture(deployFixture);
    await governance.connect(admin).createProposal(ethers.id("p1"), "ipfs://p1", startTime, endTime);
    await time.increaseTo(startTime + 1);
    await expect(governance.connect(voter1).vote(1, VoteOption.YES)).to.be.reverted;
  });

  it("only GOVERNANCE_ADMIN_ROLE / DEFAULT_ADMIN_ROLE can change protected configuration", async () => {
    const { outsider, governance } = await loadFixture(deployFixture);
    await expect(governance.connect(outsider).setParticipationFee(0)).to.be.reverted;
    await expect(governance.connect(outsider).setTreasury(outsider.address)).to.be.reverted;
    await expect(governance.connect(outsider).setProposerAuthorized(outsider.address, true)).to.be.reverted;
  });
});
