import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployMockUSDm, fundAndApprove, FEES } from "./fixtures";

const ServiceType = { P2P: 0, EDUCATION: 1, REFORESTATION: 2 };

/// @notice Property-style checks over a range of prices/BPS configurations,
/// proving the "total distributed == original payment" invariant holds for
/// every combination — not just the default 80/20 configuration. This is a
/// bounded sweep rather than a full fuzzing harness (e.g. Foundry/Echidna),
/// which this Hardhat/TS setup does not include; see docs/SECURITY.md for
/// what property-based tooling is recommended but NOT executed here.
describe("CeloHTServicePayments — invariant sweep", () => {
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

  const priceSamples = [
    1n,
    2n,
    3n,
    100n,
    12345n,
    ethers.parseUnits("0.010", 18),
    ethers.parseUnits("1", 18),
  ];
  const bpsSamples = [0, 1, 4999, 5000, 5001, 8000, 9999, 10000];

  for (const bps of bpsSamples) {
    for (const priceRaw of priceSamples) {
      it(`splits exactly for bps=${bps}, price=${priceRaw.toString()}`, async () => {
        const { admin, treasury, agentWallet, customer, usdm, payments } =
          await loadFixture(deployFixture);

        await payments.connect(admin).setAgentShareBps(bps);
        await payments
          .connect(admin)
          .setServicePrice(ServiceType.P2P, priceRaw);
        if (priceRaw > 0n) {
          await fundAndApprove(
            usdm,
            customer,
            await payments.getAddress(),
            priceRaw,
          );
        }

        const treasuryBefore = await usdm.balanceOf(treasury.address);
        const agentBefore = await usdm.balanceOf(agentWallet.address);

        await payments.connect(customer).payForService(ServiceType.P2P, 1n);

        const agentShare =
          (await usdm.balanceOf(agentWallet.address)) - agentBefore;
        const treasuryShare =
          (await usdm.balanceOf(treasury.address)) - treasuryBefore;

        // Core invariant: nothing created, nothing destroyed.
        expect(agentShare + treasuryShare).to.equal(priceRaw);
        // Agent share matches the configured bps exactly (integer division).
        expect(agentShare).to.equal((priceRaw * BigInt(bps)) / 10000n);
      });
    }
  }
});
