import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CeloHTERC8004IdentityLink", () => {
  async function deployFixture() {
    const [admin, treasury, alice, bob] = await ethers.getSigners();
    const usdm = await (await ethers.getContractFactory("MockUSDm")).deploy();
    const agentRegistry = await (
      await ethers.getContractFactory("CeloHTAgentRegistry")
    ).deploy(await usdm.getAddress(), treasury.address, 0, admin.address);
    await agentRegistry.connect(alice).registerAgent();
    await agentRegistry.connect(bob).registerAgent();

    const identityRegistry = await (
      await ethers.getContractFactory("MockERC8004IdentityRegistry")
    ).deploy();
    await identityRegistry.mint(alice.address, 0);
    await identityRegistry.mint(bob.address, 1);

    const link = await (
      await ethers.getContractFactory("CeloHTERC8004IdentityLink")
    ).deploy(
      await agentRegistry.getAddress(),
      await identityRegistry.getAddress(),
    );
    return { admin, alice, bob, agentRegistry, identityRegistry, link };
  }

  it("links only when the registered CeloHT wallet owns both identities", async () => {
    const { alice, bob, link } = await loadFixture(deployFixture);

    await expect(
      link.connect(alice).linkAgentIdentity(1, 1),
    ).to.be.revertedWithCustomError(link, "NotERC8004AgentAuthorized");

    await expect(link.connect(alice).linkAgentIdentity(1, 0))
      .to.emit(link, "AgentIdentityLinked")
      .withArgs(1, 0, alice.address);

    expect(await link.getERC8004AgentId(1)).to.deep.equal([true, 0n]);
    expect(await link.getCeloHTAgentId(0)).to.deep.equal([true, 1n]);
    expect(await link.isLinkOwnerCurrent(1)).to.equal(true);

    await expect(
      link.connect(bob).linkAgentIdentity(1, 1),
    ).to.be.revertedWithCustomError(link, "NotCeloHTAgentWallet");
  });

  it("accepts an ERC-8004 operator authorized by the identity owner", async () => {
    const { alice, bob, identityRegistry, link } =
      await loadFixture(deployFixture);
    await identityRegistry.mint(bob.address, 2);
    await identityRegistry.connect(bob).approve(alice.address, 2);

    await link.connect(alice).linkAgentIdentity(1, 2);
    expect(await link.isLinkOwnerCurrent(1)).to.equal(true);
  });

  it("keeps CeloHT and ERC-8004 links one-to-one", async () => {
    const { alice, bob, link } = await loadFixture(deployFixture);
    await link.connect(alice).linkAgentIdentity(1, 0);

    await expect(
      link.connect(alice).linkAgentIdentity(1, 1),
    ).to.be.revertedWithCustomError(link, "CeloHTAgentAlreadyLinked");
    await expect(
      link.connect(bob).linkAgentIdentity(2, 0),
    ).to.be.revertedWithCustomError(link, "ERC8004AgentAlreadyLinked");
  });

  it("detects transferred ERC-8004 identities and allows the CeloHT owner to repair the link", async () => {
    const { alice, bob, identityRegistry, link } =
      await loadFixture(deployFixture);
    await link.connect(alice).linkAgentIdentity(1, 0);
    await identityRegistry.connect(alice).transfer(0, bob.address);

    expect(await link.isLinkOwnerCurrent(1)).to.equal(false);
    await expect(
      link.connect(alice).linkAgentIdentity(1, 1),
    ).to.be.revertedWithCustomError(link, "CeloHTAgentAlreadyLinked");

    await link.connect(alice).unlinkAgentIdentity(1);
    await identityRegistry.mint(alice.address, 2);
    await link.connect(alice).linkAgentIdentity(1, 2);

    expect(await link.isLinkOwnerCurrent(1)).to.equal(true);
    expect(await link.getCeloHTAgentId(0)).to.deep.equal([false, 0n]);
  });

  it("rejects links for inactive agents and unauthorized unlink attempts", async () => {
    const { admin, alice, bob, agentRegistry, link } =
      await loadFixture(deployFixture);
    await agentRegistry.connect(admin).setAgentStatus(1, false);

    await expect(
      link.connect(alice).linkAgentIdentity(1, 0),
    ).to.be.revertedWithCustomError(link, "AgentInactive");
    await expect(
      link.connect(bob).unlinkAgentIdentity(1),
    ).to.be.revertedWithCustomError(link, "NotCeloHTAgentWallet");
    await expect(
      link.connect(alice).unlinkAgentIdentity(1),
    ).to.be.revertedWithCustomError(link, "AgentNotLinked");
  });

  it("reports links to inactive CeloHT agents as stale", async () => {
    const { admin, alice, agentRegistry, link } =
      await loadFixture(deployFixture);
    await link.connect(alice).linkAgentIdentity(1, 0);
    await agentRegistry.connect(admin).setAgentStatus(1, false);

    expect(await link.isLinkOwnerCurrent(1)).to.equal(false);
  });
});
