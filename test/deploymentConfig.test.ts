import { expect } from "chai";
import hardhatConfig, {
  CELO_SEPOLIA_CHAIN_ID,
  CELO_SEPOLIA_RPC_URL,
} from "../hardhat.config";
import {
  loadDeploymentConfig,
  validateDeploymentEnvironment,
} from "../deployConfig";

const requiredVariables = [
  "SEPOLIA_RPC_URL",
  "PRIVATE_KEY",
  "USDM_ADDRESS_CELO_SEPOLIA",
  "GENERAL_TREASURY",
  "EDUCATION_TREASURY",
  "REFORESTATION_TREASURY",
  "GOVERNANCE_TREASURY",
] as const;

const mockEnvironment: Record<(typeof requiredVariables)[number], string> = {
  SEPOLIA_RPC_URL: "https://sepolia.example.invalid",
  PRIVATE_KEY: `0x${"11".repeat(32)}`,
  USDM_ADDRESS_CELO_SEPOLIA: `0x${"22".repeat(20)}`,
  GENERAL_TREASURY: `0x${"33".repeat(20)}`,
  EDUCATION_TREASURY: `0x${"44".repeat(20)}`,
  REFORESTATION_TREASURY: `0x${"55".repeat(20)}`,
  GOVERNANCE_TREASURY: `0x${"66".repeat(20)}`,
};

describe("deployment configuration", () => {
  const originalEnvironment: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const name of requiredVariables) {
      originalEnvironment[name] = process.env[name];
      process.env[name] = mockEnvironment[name];
    }
    originalEnvironment.USDm_ADDRESS_CELO_SEPOLIA =
      process.env.USDm_ADDRESS_CELO_SEPOLIA;
    delete process.env.USDm_ADDRESS_CELO_SEPOLIA;
  });

  afterEach(() => {
    for (const name of requiredVariables) {
      if (originalEnvironment[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = originalEnvironment[name];
      }
    }
    if (originalEnvironment.USDm_ADDRESS_CELO_SEPOLIA === undefined) {
      delete process.env.USDm_ADDRESS_CELO_SEPOLIA;
    } else {
      process.env.USDm_ADDRESS_CELO_SEPOLIA =
        originalEnvironment.USDm_ADDRESS_CELO_SEPOLIA;
    }
  });

  it("passes when all seven required variables are present", () => {
    expect(validateDeploymentEnvironment()).to.deep.include({
      usdm: mockEnvironment.USDM_ADDRESS_CELO_SEPOLIA,
    });
  });

  for (const name of requiredVariables) {
    it(`fails when ${name} is missing`, () => {
      delete process.env[name];
      expect(() => validateDeploymentEnvironment()).to.throw(
        `Missing required deployment secret: ${name}`,
      );
    });
  }

  it("requires the canonical USDm variable name", () => {
    delete process.env.USDM_ADDRESS_CELO_SEPOLIA;
    process.env.USDm_ADDRESS_CELO_SEPOLIA =
      mockEnvironment.USDM_ADDRESS_CELO_SEPOLIA;
    expect(() => validateDeploymentEnvironment()).to.throw(
      "Missing required deployment secret: USDM_ADDRESS_CELO_SEPOLIA",
    );
  });

  it("rejects a malformed USDm address", () => {
    process.env.USDM_ADDRESS_CELO_SEPOLIA = "not-an-address";
    expect(() => validateDeploymentEnvironment()).to.throw(
      "Invalid EVM address format: USDM_ADDRESS_CELO_SEPOLIA",
    );
  });

  it("rejects a malformed treasury address", () => {
    process.env.GENERAL_TREASURY = "not-an-address";
    expect(() => validateDeploymentEnvironment()).to.throw(
      "Invalid EVM address format: GENERAL_TREASURY",
    );
  });

  it("accepts only the Celo Sepolia deployment network", () => {
    const celoSepolia = hardhatConfig.networks?.celoSepolia;
    expect(celoSepolia).to.include({
      chainId: CELO_SEPOLIA_CHAIN_ID,
      url: CELO_SEPOLIA_RPC_URL,
    });
    expect(() => loadDeploymentConfig("sepolia")).to.throw(
      "Unsupported deployment network",
    );
    expect(loadDeploymentConfig("celoSepolia").usdm).to.equal(
      mockEnvironment.USDM_ADDRESS_CELO_SEPOLIA,
    );
  });
});
