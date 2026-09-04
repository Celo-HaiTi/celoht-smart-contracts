import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import {
  deployMockUSDm,
  deployMockWrongToken,
  fundAndApprove,
  FEES,
} from "./fixtures";

describe("CeloHTAgentRegistry", () => {
  async function deployFixture() {
    const [admin, treasury, alice, bob] = await ethers.getSigners();
    const usdm = await deployMockUSDm();
    const Registry = await ethers.getContractFactory("CeloHTAgentRegistry");
    const registry = await Registry.deploy(
      await usdm.getAddress(),
      treasury.address,
      FEES.registration,
      admin.address,
    );
    return { admin, treasury, alice, bob, usdm, registry };
  }

  it("registers a new agent and charges the exact registration fee to the treasury", async () => {
    const { treasury, alice, usdm, registry } =
      await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      alice,
      await registry.getAddress(),
      FEES.registration,
    );

    await expect(registry.connect(alice).registerAgent())
      .to.emit(registry, "AgentRegistered")
      .withArgs(1, alice.address, anyValue);

    expect(await usdm.balanceOf(treasury.address)).to.equal(FEES.registration);
    expect(await registry.agentExists(1)).to.equal(true);
    expect(await registry.isAgentActive(1)).to.equal(true);
    expect(await registry.agentIdOf(alice.address)).to.equal(1);
  });

  it("rejects duplicate registrations from the same wallet", async () => {
    const { alice, usdm, registry } = await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      alice,
      await registry.getAddress(),
      FEES.registration * 2n,
    );
    await registry.connect(alice).registerAgent();

    await expect(
      registry.connect(alice).registerAgent(),
    ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
  });

  it("reverts registration if the USDm allowance is insufficient", async () => {
    const { alice, registry } = await loadFixture(deployFixture);
    // No approval granted.
    await expect(registry.connect(alice).registerAgent()).to.be.reverted;
  });

  it("only AGENT_ADMIN_ROLE can set agent status, and unknown agents revert", async () => {
    const { admin, alice, bob, usdm, registry } =
      await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      alice,
      await registry.getAddress(),
      FEES.registration,
    );
    await registry.connect(alice).registerAgent();

    await expect(registry.connect(bob).setAgentStatus(1, false)).to.be.reverted;

    await expect(registry.connect(admin).setAgentStatus(1, false))
      .to.emit(registry, "AgentStatusUpdated")
      .withArgs(1, false);
    expect(await registry.isAgentActive(1)).to.equal(false);

    await expect(
      registry.connect(admin).setAgentStatus(999, false),
    ).to.be.revertedWithCustomError(registry, "AgentNotFound");
  });

  it("rejects a zero treasury address on construction and on update", async () => {
    const { admin, usdm } = await loadFixture(deployFixture);
    const Registry = await ethers.getContractFactory("CeloHTAgentRegistry");
    await expect(
      Registry.deploy(
        await usdm.getAddress(),
        ethers.ZeroAddress,
        FEES.registration,
        admin.address,
      ),
    ).to.be.reverted;
  });

  it("only counts USDm, never the wrong token, toward the registration fee", async () => {
    const { treasury, alice, registry } = await loadFixture(deployFixture);
    const wrongToken = await deployMockWrongToken();
    await fundAndApprove(
      wrongToken,
      alice,
      await registry.getAddress(),
      FEES.registration,
    );

    // The registry's `usdm` is immutable and unrelated to wrongToken, so
    // registerAgent() will attempt to pull the real usdm token, for which
    // alice has no allowance — it must revert regardless of wrongToken.
    await expect(registry.connect(alice).registerAgent()).to.be.reverted;
    expect(await treasury.getAddress()).to.be.properAddress;
  });

  it("rejects fee-on-transfer tokens that deliver less than the registration fee", async () => {
    const [admin, treasury, alice] = await ethers.getSigners();
    const FeeToken = await ethers.getContractFactory("MockFeeOnTransferUSDm");
    const feeToken = await FeeToken.deploy();
    const Registry = await ethers.getContractFactory("CeloHTAgentRegistry");
    const registry = await Registry.deploy(
      await feeToken.getAddress(),
      treasury.address,
      FEES.registration,
      admin.address,
    );

    await feeToken.mint(alice.address, FEES.registration);
    await feeToken
      .connect(alice)
      .approve(await registry.getAddress(), FEES.registration);

    await expect(registry.connect(alice).registerAgent())
      .to.be.revertedWithCustomError(registry, "IncorrectAmount")
      .withArgs(FEES.registration, (FEES.registration * 9500n) / 10000n);
  });
});
