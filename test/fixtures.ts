import { ethers } from "hardhat";

export const FEES = {
  registration: ethers.parseUnits("0.20", 18),
  p2p: ethers.parseUnits("0.010", 18),
  education: ethers.parseUnits("0.020", 18),
  certificate: ethers.parseUnits("0.010", 18),
  vote: ethers.parseUnits("0.010", 18),
};

export async function deployMockUSDm() {
  const Factory = await ethers.getContractFactory("MockUSDm");
  return Factory.deploy();
}

export async function deployMockWrongToken() {
  const Factory = await ethers.getContractFactory("MockWrongToken");
  return Factory.deploy();
}

type MintableToken = {
  mint(to: string, amount: bigint): Promise<unknown>;
  connect(user: unknown): {
    approve(spender: string, amount: bigint): Promise<unknown>;
  };
};

type User = { address: string };

export async function fundAndApprove(
  token: MintableToken,
  user: User,
  spender: string,
  amount: bigint,
) {
  await token.mint(user.address, amount);
  await token.connect(user).approve(spender, amount);
}
