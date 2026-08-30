import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployMockUSDm, fundAndApprove, FEES } from "./fixtures";

const ServiceType = { P2P: 0, EDUCATION: 1, REFORESTATION: 2 };

describe("CeloHTServicePayments", () => {
  async function deployFixture() {
    const [admin, treasury, agentWallet, customer, other] = await ethers.getSigners();
    const usdm = await deployMockUSDm();

    const Registry = await ethers.getContractFactory("CeloHTAgentRegistry");
    const registry = await Registry.deploy(
      await usdm.getAddress(),
      treasury.address,
      FEES.registration,
      admin.address
    );
    await fundAndApprove(usdm, agentWallet, await registry.getAddress(), FEES.registration);
    await registry.connect(agentWallet).registerAgent();
    const agentId = 1n;

    const Payments = await ethers.getContractFactory("CeloHTServicePayments");
    const payments = await Payments.deploy(
      await usdm.getAddress(),
      await registry.getAddress(),
      treasury.address,
      admin.address,
      FEES.p2p,
      FEES.education
    );

    return { admin, treasury, agentWallet, customer, other, usdm, registry, payments, agentId };
  }

  it("enforces the exact 80/20 split with no funds created or destroyed (P2P)", async () => {
    const { treasury, agentWallet, customer, usdm, payments, agentId } = await loadFixture(deployFixture);
    await fundAndApprove(usdm, customer, await payments.getAddress(), FEES.p2p);

    const treasuryBefore = await usdm.balanceOf(treasury.address);
    const agentBefore = await usdm.balanceOf(agentWallet.address);

    await payments.connect(customer).payForService(ServiceType.P2P, agentId);

    const treasuryAfter = await usdm.balanceOf(treasury.address);
    const agentAfter = await usdm.balanceOf(agentWallet.address);

    const agentShare = agentAfter - agentBefore;
    const treasuryShare = treasuryAfter - treasuryBefore;

    expect(agentShare).to.equal((FEES.p2p * 8000n) / 10000n);
    expect(agentShare + treasuryShare).to.equal(FEES.p2p);
  });

  it("enforces the exact 80/20 split for Education service payments", async () => {
    const { treasury, agentWallet, customer, usdm, payments, agentId } = await loadFixture(deployFixture);
    await fundAndApprove(usdm, customer, await payments.getAddress(), FEES.education);

    const treasuryBefore = await usdm.balanceOf(treasury.address);
    const agentBefore = await usdm.balanceOf(agentWallet.address);

    await payments.connect(customer).payForService(ServiceType.EDUCATION, agentId);

    const agentShare = (await usdm.balanceOf(agentWallet.address)) - agentBefore;
    const treasuryShare = (await usdm.balanceOf(treasury.address)) - treasuryBefore;

    expect(agentShare).to.equal((FEES.education * 8000n) / 10000n);
    expect(agentShare + treasuryShare).to.equal(FEES.education);
  });

  it("reforestation assistance is free and moves zero funds", async () => {
    const { treasury, agentWallet, customer, usdm, payments, agentId } = await loadFixture(deployFixture);

    const treasuryBefore = await usdm.balanceOf(treasury.address);
    const agentBefore = await usdm.balanceOf(agentWallet.address);

    await expect(payments.connect(customer).payForService(ServiceType.REFORESTATION, agentId))
      .to.emit(payments, "PaymentDistributed")
      .withArgs(1, 0, 0);

    expect(await usdm.balanceOf(treasury.address)).to.equal(treasuryBefore);
    expect(await usdm.balanceOf(agentWallet.address)).to.equal(agentBefore);
  });

  it("rejects payment to a nonexistent agent", async () => {
    const { customer, usdm, payments } = await loadFixture(deployFixture);
    await fundAndApprove(usdm, customer, await payments.getAddress(), FEES.p2p);
    await expect(payments.connect(customer).payForService(ServiceType.P2P, 999)).to.be.revertedWithCustomError(
      payments,
      "AgentNotFound"
    );
  });

  it("rejects paid-service revenue for an inactive agent", async () => {
    const { admin, customer, usdm, registry, payments, agentId } = await loadFixture(deployFixture);
    await registry.connect(admin).setAgentStatus(agentId, false);
    await fundAndApprove(usdm, customer, await payments.getAddress(), FEES.p2p);

    await expect(payments.connect(customer).payForService(ServiceType.P2P, agentId)).to.be.revertedWithCustomError(
      payments,
      "AgentInactive"
    );
  });

  it("reverts if the customer has not approved sufficient USDm", async () => {
    const { customer, payments, agentId } = await loadFixture(deployFixture);
    await expect(payments.connect(customer).payForService(ServiceType.P2P, agentId)).to.be.reverted;
  });

  it("records unique, queryable payment IDs", async () => {
    const { customer, usdm, payments, agentId } = await loadFixture(deployFixture);
    await fundAndApprove(usdm, customer, await payments.getAddress(), FEES.p2p * 2n);

    await payments.connect(customer).payForService(ServiceType.P2P, agentId);
    await payments.connect(customer).payForService(ServiceType.P2P, agentId);

    const p1 = await payments.getPayment(1);
    const p2 = await payments.getPayment(2);
    expect(p1.paymentId).to.not.equal(p2.paymentId);
  });

  it("only FEE_ADMIN_ROLE can update prices, and rejects the wrong split configuration", async () => {
    const { admin, other, payments } = await loadFixture(deployFixture);
    await expect(payments.connect(other).setServicePrice(ServiceType.P2P, 1)).to.be.reverted;
    await expect(payments.connect(admin).setServicePrice(ServiceType.P2P, 1)).to.emit(
      payments,
      "ServicePriceUpdated"
    );

    await expect(payments.connect(other).setAgentShareBps(9000)).to.be.reverted;
    await expect(payments.connect(admin).setAgentShareBps(10001)).to.be.revertedWithCustomError(
      payments,
      "InvalidBps"
    );
  });
});
