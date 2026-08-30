import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { deployMockUSDm, fundAndApprove } from "./fixtures";

describe("CeloHTReforestation", () => {
  async function deployFixture() {
    const [admin, treasury, donor1, donor2] = await ethers.getSigners();
    const usdm = await deployMockUSDm();

    const Reforestation = await ethers.getContractFactory("CeloHTReforestation");
    const reforestation = await Reforestation.deploy(await usdm.getAddress(), treasury.address, admin.address);

    return { admin, treasury, donor1, donor2, usdm, reforestation };
  }

  it("accepts a voluntary USDm donation and routes it to the treasury", async () => {
    const { treasury, donor1, usdm, reforestation } = await loadFixture(deployFixture);
    const amount = ethers.parseUnits("5", 18);
    await fundAndApprove(usdm, donor1, await reforestation.getAddress(), amount);

    await expect(reforestation.connect(donor1).donate(amount))
      .to.emit(reforestation, "DonationReceived")
      .withArgs(1, donor1.address, amount, anyValue);

    expect(await usdm.balanceOf(treasury.address)).to.equal(amount);
    expect(await reforestation.totalDonated()).to.equal(amount);
    expect(await reforestation.donationCount()).to.equal(1);
    expect(await reforestation.donorTotal(donor1.address)).to.equal(amount);
  });

  it("rejects a zero-amount donation", async () => {
    const { donor1, reforestation } = await loadFixture(deployFixture);
    await expect(reforestation.connect(donor1).donate(0)).to.be.revertedWithCustomError(
      reforestation,
      "ZeroAmount"
    );
  });

  it("tracks cumulative totals across multiple donors", async () => {
    const { donor1, donor2, usdm, reforestation } = await loadFixture(deployFixture);
    const a1 = ethers.parseUnits("2", 18);
    const a2 = ethers.parseUnits("3", 18);
    await fundAndApprove(usdm, donor1, await reforestation.getAddress(), a1);
    await fundAndApprove(usdm, donor2, await reforestation.getAddress(), a2);

    await reforestation.connect(donor1).donate(a1);
    await reforestation.connect(donor2).donate(a2);

    expect(await reforestation.totalDonated()).to.equal(a1 + a2);
    expect(await reforestation.donationCount()).to.equal(2);
  });

  it("reverts donation if allowance is insufficient", async () => {
    const { donor1, reforestation } = await loadFixture(deployFixture);
    await expect(reforestation.connect(donor1).donate(1)).to.be.reverted;
  });

  it("only TREASURY_ADMIN_ROLE can update the treasury, and rejects zero address", async () => {
    const { admin, donor1, reforestation } = await loadFixture(deployFixture);
    await expect(reforestation.connect(donor1).setTreasury(donor1.address)).to.be.reverted;
    await expect(reforestation.connect(admin).setTreasury(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      reforestation,
      "ZeroAddress"
    );
  });
});
