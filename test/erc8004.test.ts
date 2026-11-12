import { expect } from "chai";
import { Interface } from "ethers";
import { ethers } from "hardhat";
import {
  AgentRegistrationFile,
  createAgentRegistrationFile,
  ERC8004_REGISTRATION_TYPE,
  validateAgentRegistrationFile,
} from "../agentRegistration";
import {
  assertERC8004Deployment,
  ERC8004_ABIS,
  ERC8004_NETWORKS,
  getERC8004NetworkConfig,
} from "../erc8004Config";

async function expectRejectedWith(
  promise: Promise<unknown>,
  expectedMessage: string,
) {
  let caught: unknown;
  try {
    await promise;
  } catch (error: unknown) {
    caught = error;
  }
  expect(caught).to.be.instanceOf(Error);
  if (!(caught instanceof Error)) {
    throw new Error("Expected operation to reject.");
  }
  expect(caught.message).to.contain(expectedMessage);
}

describe("ERC-8004 integration configuration and registrations", () => {
  it("uses the official registry deployments for both Celo networks", () => {
    expect(getERC8004NetworkConfig(11142220n)).to.equal(
      ERC8004_NETWORKS.celoSepolia,
    );
    expect(getERC8004NetworkConfig(42220n)).to.equal(
      ERC8004_NETWORKS.celoMainnet,
    );
    expect(
      ERC8004_NETWORKS.celoSepolia.sourceVerified.validationRegistry,
    ).to.equal(true);
    expect(
      ERC8004_NETWORKS.celoMainnet.sourceVerified.validationRegistry,
    ).to.equal(true);
    expect(() => getERC8004NetworkConfig(1n)).to.throw(
      "No official ERC-8004 registry configuration",
    );
  });

  it("builds a registration file that binds its agent ID to the official identity registry", () => {
    const registration = createAgentRegistrationFile({
      chainId: 11142220n,
      agentId: 7n,
      name: "Test agent",
      description: "Local registration-file validation fixture.",
      image: "https://example.invalid/agents/7.png",
      services: [
        {
          name: "web",
          endpoint: "https://example.invalid/agents/7",
        },
      ],
      x402Support: false,
      active: true,
      supportedTrust: ["reputation", "validation"],
    });

    expect(registration).to.deep.equal({
      type: ERC8004_REGISTRATION_TYPE,
      name: "Test agent",
      description: "Local registration-file validation fixture.",
      image: "https://example.invalid/agents/7.png",
      services: [
        {
          name: "web",
          endpoint: "https://example.invalid/agents/7",
        },
      ],
      x402Support: false,
      active: true,
      registrations: [
        {
          agentId: 7,
          agentRegistry: `eip155:11142220:${ERC8004_NETWORKS.celoSepolia.identityRegistry}`,
        },
      ],
      supportedTrust: ["reputation", "validation"],
    });
  });

  it("exposes the ERC-8004 registration, reputation, and validation ABI methods", () => {
    const identity = new Interface(ERC8004_ABIS.identity);
    const reputation = new Interface(ERC8004_ABIS.reputation);
    const validation = new Interface(ERC8004_ABIS.validation);

    for (const signature of [
      "register()",
      "register(string)",
      "register(string,(string,bytes)[])",
      "setAgentURI(uint256,string)",
      "setAgentWallet(uint256,address,uint256,bytes)",
      "unsetAgentWallet(uint256)",
      "isAuthorizedOrOwner(address,uint256)",
      "safeTransferFrom(address,address,uint256,bytes)",
    ]) {
      expect(identity.getFunction(signature), signature).not.to.equal(null);
    }
    for (const signature of [
      "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
      "readFeedback(uint256,address,uint64)",
      "readAllFeedback(uint256,address[],string,string,bool)",
      "revokeFeedback(uint256,uint64)",
      "appendResponse(uint256,address,uint64,string,bytes32)",
      "getSummary(uint256,address[],string,string)",
    ]) {
      expect(reputation.getFunction(signature), signature).not.to.equal(null);
    }
    for (const signature of [
      "validationRequest(address,uint256,string,bytes32)",
      "validationResponse(bytes32,uint8,string,bytes32,string)",
      "getValidationStatus(bytes32)",
      "getSummary(uint256,address[],string)",
      "getAgentValidations(uint256)",
      "getValidatorRequests(address)",
    ]) {
      expect(validation.getFunction(signature), signature).not.to.equal(null);
    }

    expect(
      identity.getEvent("Registered(uint256,string,address)"),
    ).not.to.equal(null);
    expect(
      reputation.getEvent(
        "NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)",
      ),
    ).not.to.equal(null);
    expect(
      validation.getEvent(
        "ValidationResponse(address,uint256,bytes32,uint8,string,bytes32,string)",
      ),
    ).not.to.equal(null);
  });

  it("rejects unsafe IDs and malformed required registration fields", () => {
    expect(() =>
      createAgentRegistrationFile({
        chainId: 11142220n,
        agentId: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
        name: "agent",
        description: "description",
        image: "https://example.com/image.png",
        services: [],
        x402Support: false,
        active: true,
      }),
    ).to.throw("JSON-safe integer");

    const invalidRegistration: Partial<AgentRegistrationFile> = {
      type: ERC8004_REGISTRATION_TYPE,
      name: " ",
      description: "description",
      image: "https://example.com/image.png",
      services: [],
      x402Support: false,
      active: true,
      registrations: [
        {
          agentId: 1,
          agentRegistry: "eip155:11142220:not-an-address",
        },
      ],
    };
    expect(() => validateAgentRegistrationFile(invalidRegistration)).to.throw(
      "non-empty name",
    );
    invalidRegistration.name = "agent";
    expect(() => validateAgentRegistrationFile(invalidRegistration)).to.throw(
      "eip155:<chainId>",
    );
  });

  it("rejects malformed agent services and empty registration references", () => {
    const registration = createAgentRegistrationFile({
      chainId: 11142220n,
      agentId: 7n,
      name: "Test agent",
      description: "Local registration-file validation fixture.",
      image: "https://example.invalid/agents/7.png",
      services: [{ name: "web", endpoint: "https://example.invalid" }],
      x402Support: false,
      active: true,
    });

    registration.services[0].endpoint = " ";
    expect(() => validateAgentRegistrationFile(registration)).to.throw(
      "non-empty name and endpoint",
    );

    registration.services[0].endpoint = "https://example.invalid";
    registration.registrations = [];
    expect(() => validateAgentRegistrationFile(registration)).to.throw(
      "at least one registration reference",
    );
  });

  it("rejects local or mismatched chains before any registry interaction", async () => {
    await expectRejectedWith(
      assertERC8004Deployment(ethers.provider),
      "No official ERC-8004 registry configuration",
    );
    await expectRejectedWith(
      assertERC8004Deployment(ethers.provider, 11142220n),
      "ERC-8004 chain mismatch",
    );
  });
});
