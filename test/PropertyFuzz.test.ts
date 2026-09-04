import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployMockUSDm, fundAndApprove, FEES } from "./fixtures";

const ServiceType = { P2P: 0 };

function nextRandom(state: bigint): bigint {
  return (state * 1103515245n + 12345n) % 2147483648n;
}

describe("CeloHTServicePayments - property fuzzing", () => {
  async function deployFixture() {
    const [admin, treasury, agentWallet, customer] = await ethers.getSigners();
    const usdm = await deployMockUSDm();
    const Registry = await ethers.getContractFactory("CeloHTAgentRegistry");
    const registry = await Registry.deploy(
      await usdm.getAddress(),
      treasury.address,
      FEES.registration,
      admin.address,
    );
    await fundAndApprove(
      usdm,
      agentWallet,
      await registry.getAddress(),
      FEES.registration,
    );
    await registry.connect(agentWallet).registerAgent();

    const Payments = await ethers.getContractFactory("CeloHTServicePayments");
    const payments = await Payments.deploy(
      await usdm.getAddress(),
      await registry.getAddress(),
      treasury.address,
      admin.address,
      FEES.p2p,
      FEES.education,
    );
    return { admin, treasury, agentWallet, customer, usdm, payments };
  }

  it("preserves exact distribution across randomized prices and splits", async () => {
    const { admin, treasury, agentWallet, customer, usdm, payments } =
      await loadFixture(deployFixture);
    let state = 7n;

    for (let iteration = 0; iteration < 100; iteration += 1) {
      state = nextRandom(state);
      const bps = Number(state % 10001n);
      state = nextRandom(state);
      const price = (state % 1_000_000_000_000_000_000n) + 1n;

      await payments.connect(admin).setAgentShareBps(bps);
      await payments.connect(admin).setServicePrice(ServiceType.P2P, price);
      await fundAndApprove(usdm, customer, await payments.getAddress(), price);

      const treasuryBefore = await usdm.balanceOf(treasury.address);
      const agentBefore = await usdm.balanceOf(agentWallet.address);
      await payments.connect(customer).payForService(ServiceType.P2P, 1n);

      const agentShare =
        (await usdm.balanceOf(agentWallet.address)) - agentBefore;
      const treasuryShare =
        (await usdm.balanceOf(treasury.address)) - treasuryBefore;
      expect(agentShare).to.equal((price * BigInt(bps)) / 10000n);
      expect(agentShare + treasuryShare).to.equal(price);
    }
  });
});
