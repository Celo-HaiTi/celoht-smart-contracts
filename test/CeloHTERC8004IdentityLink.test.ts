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

  it("marks revoked ERC-721 operator authorization stale and permits repair", async () => {
    const { alice, bob, identityRegistry, link } =
      await loadFixture(deployFixture);
    await identityRegistry.mint(bob.address, 2);
    await identityRegistry.connect(bob).approve(alice.address, 2);
    await link.connect(alice).linkAgentIdentity(1, 2);

    await identityRegistry.connect(bob).approve(bob.address, 2);
    expect(await link.isLinkOwnerCurrent(1)).to.equal(false);

    await link.connect(alice).unlinkAgentIdentity(1);
    await link.connect(alice).linkAgentIdentity(1, 0);
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

  it("rejects zero, code-free, and non-ERC-721 registry addresses", async () => {
    const { agentRegistry, identityRegistry } =
      await loadFixture(deployFixture);
    const Link = await ethers.getContractFactory("CeloHTERC8004IdentityLink");
    const token = await (await ethers.getContractFactory("MockUSDm")).deploy();
    const noCode = "0x0000000000000000000000000000000000000001";

    await expect(
      Link.deploy(ethers.ZeroAddress, await identityRegistry.getAddress()),
    )
      .to.be.revertedWithCustomError(Link, "ZeroAddress")
      .withArgs();
    await expect(Link.deploy(noCode, await identityRegistry.getAddress()))
      .to.be.revertedWithCustomError(Link, "AddressHasNoCode")
      .withArgs(noCode);
    await expect(Link.deploy(await agentRegistry.getAddress(), noCode))
      .to.be.revertedWithCustomError(Link, "AddressHasNoCode")
      .withArgs(noCode);
    await expect(
      Link.deploy(await agentRegistry.getAddress(), await token.getAddress()),
    )
      .to.be.revertedWithCustomError(Link, "UnsupportedIdentityRegistry")
      .withArgs(await token.getAddress());
  });

  it("rejects unregistered CeloHT and ERC-8004 agent IDs", async () => {
    const { alice, agentRegistry, link } = await loadFixture(deployFixture);

    await expect(link.connect(alice).linkAgentIdentity(999, 0))
      .to.be.revertedWithCustomError(agentRegistry, "AgentNotFound")
      .withArgs(999);
    await expect(
      link.connect(alice).linkAgentIdentity(1, 999),
    ).to.be.revertedWith("unknown agent");
  });
});
