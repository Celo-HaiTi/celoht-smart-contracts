import { Contract, getAddress, isAddress } from "ethers";
import type { Provider, Signer } from "ethers";
import deployment from "./deployments/erc8004.json";

export const ERC8004_SOURCE_COMMIT = deployment.sourceCommit;
export const ERC8004_SOURCE_URL = `https://github.com/erc-8004/erc-8004-contracts/tree/${ERC8004_SOURCE_COMMIT}`;

export interface ERC8004NetworkConfig {
  network: "celoSepolia" | "celoMainnet";
  chainId: bigint;
  explorerUrl: string;
  identityRegistry: string;
  reputationRegistry: string;
  validationRegistry: string;
  sourceVerified: {
    identityRegistry: boolean;
    reputationRegistry: boolean;
    validationRegistry: boolean;
  };
}

export const ERC8004_NETWORKS: Readonly<
  Record<ERC8004NetworkConfig["network"], ERC8004NetworkConfig>
> = {
  celoSepolia: {
    network: "celoSepolia",
    chainId: BigInt(deployment.networks.celoSepolia.chainId),
    explorerUrl: deployment.networks.celoSepolia.explorer,
    identityRegistry: deployment.networks.celoSepolia.identityRegistry.address,
    reputationRegistry:
      deployment.networks.celoSepolia.reputationRegistry.address,
    validationRegistry:
      deployment.networks.celoSepolia.validationRegistry.address,
    sourceVerified: {
      identityRegistry:
        deployment.networks.celoSepolia.identityRegistry.sourceVerified,
      reputationRegistry:
        deployment.networks.celoSepolia.reputationRegistry.sourceVerified,
      validationRegistry:
        deployment.networks.celoSepolia.validationRegistry.sourceVerified,
    },
  },
  celoMainnet: {
    network: "celoMainnet",
    chainId: BigInt(deployment.networks.celoMainnet.chainId),
    explorerUrl: deployment.networks.celoMainnet.explorer,
    identityRegistry: deployment.networks.celoMainnet.identityRegistry.address,
    reputationRegistry:
      deployment.networks.celoMainnet.reputationRegistry.address,
    validationRegistry:
      deployment.networks.celoMainnet.validationRegistry.address,
    sourceVerified: {
      identityRegistry:
        deployment.networks.celoMainnet.identityRegistry.sourceVerified,
      reputationRegistry:
        deployment.networks.celoMainnet.reputationRegistry.sourceVerified,
      validationRegistry:
        deployment.networks.celoMainnet.validationRegistry.sourceVerified,
    },
  },
};

export const ERC8004_ABIS = {
  identity: [
    "function supportsInterface(bytes4 interfaceId) view returns (bool)",
    "function register() returns (uint256 agentId)",
    "function register(string agentURI) returns (uint256 agentId)",
    "function register(string agentURI, tuple(string metadataKey, bytes metadataValue)[] metadata) returns (uint256 agentId)",
    "function ownerOf(uint256 agentId) view returns (address)",
    "function getApproved(uint256 agentId) view returns (address)",
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function approve(address approved, uint256 agentId)",
    "function setApprovalForAll(address operator, bool approved)",
    "function transferFrom(address from, address to, uint256 agentId)",
    "function safeTransferFrom(address from, address to, uint256 agentId)",
    "function tokenURI(uint256 agentId) view returns (string)",
    "function setAgentURI(uint256 agentId, string newURI)",
    "function isAuthorizedOrOwner(address spender, uint256 agentId) view returns (bool)",
    "function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)",
    "function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue)",
    "function getAgentWallet(uint256 agentId) view returns (address)",
    "function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)",
    "function unsetAgentWallet(uint256 agentId)",
    "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
    "event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)",
    "event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)",
  ] as const,
  reputation: [
    "function getIdentityRegistry() view returns (address)",
    "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
    "function revokeFeedback(uint256 agentId, uint64 feedbackIndex)",
    "function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)",
    "function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) view returns (address[] clients, uint64[] feedbackIndexes, int128[] values, uint8[] valueDecimals, string[] tag1s, string[] tag2s, bool[] revokedStatuses)",
    "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
    "function getClients(uint256 agentId) view returns (address[])",
    "function getLastIndex(uint256 agentId, address clientAddress) view returns (uint64)",
    "function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex, address[] responders) view returns (uint64 count)",
    "function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash)",
    "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
    "event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)",
    "event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)",
  ] as const,
  validation: [
    "function getIdentityRegistry() view returns (address)",
    "function validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash)",
    "function validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)",
    "function getValidationStatus(bytes32 requestHash) view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string tag, uint256 lastUpdate)",
    "function getSummary(uint256 agentId, address[] validatorAddresses, string tag) view returns (uint64 count, uint8 averageResponse)",
    "function getAgentValidations(uint256 agentId) view returns (bytes32[] requestHashes)",
    "function getValidatorRequests(address validatorAddress) view returns (bytes32[] requestHashes)",
    "event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)",
    "event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)",
  ] as const,
};

export interface ERC8004Contracts {
  identity: Contract;
  reputation: Contract;
  validation: Contract;
}

export function getERC8004NetworkConfig(
  chainId: bigint | number,
): ERC8004NetworkConfig {
  const numericChainId = BigInt(chainId);
  const config = Object.values(ERC8004_NETWORKS).find(
    (network) => network.chainId === numericChainId,
  );
  if (!config) {
    throw new Error(
      `No official ERC-8004 registry configuration for chain ID ${numericChainId}.`,
    );
  }
  return config;
}

export async function assertERC8004Deployment(
  provider: Provider,
  expectedChainId?: bigint | number,
): Promise<ERC8004NetworkConfig> {
  const actualChainId = (await provider.getNetwork()).chainId;
  const config = getERC8004NetworkConfig(expectedChainId ?? actualChainId);
  if (actualChainId !== config.chainId) {
    throw new Error(
      `ERC-8004 chain mismatch: expected ${config.chainId}, got ${actualChainId}.`,
    );
  }

  for (const [label, address] of [
    ["IdentityRegistry", config.identityRegistry],
    ["ReputationRegistry", config.reputationRegistry],
    ["ValidationRegistry", config.validationRegistry],
  ] as const) {
    if (
      !isAddress(address) ||
      getAddress(address) === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error(`Invalid official ERC-8004 ${label} address.`);
    }
    if ((await provider.getCode(address)) === "0x") {
      throw new Error(
        `No contract bytecode for ERC-8004 ${label} at ${address} on chain ${config.chainId}.`,
      );
    }
  }

  const [isERC721, reputationIdentity, validationIdentity] = await Promise.all([
    new Contract(
      config.identityRegistry,
      ERC8004_ABIS.identity,
      provider,
    ).supportsInterface("0x80ac58cd"),
    new Contract(
      config.reputationRegistry,
      ERC8004_ABIS.reputation,
      provider,
    ).getIdentityRegistry(),
    new Contract(
      config.validationRegistry,
      ERC8004_ABIS.validation,
      provider,
    ).getIdentityRegistry(),
  ]);

  if (!isERC721) {
    throw new Error(
      `ERC-8004 Identity Registry at ${config.identityRegistry} does not report ERC-721 support.`,
    );
  }
  if (
    getAddress(reputationIdentity) !== getAddress(config.identityRegistry) ||
    getAddress(validationIdentity) !== getAddress(config.identityRegistry)
  ) {
    throw new Error(
      "ERC-8004 Reputation and Validation registries do not reference the configured Identity Registry.",
    );
  }

  return config;
}

export async function getERC8004Contracts(
  provider: Provider,
  signer?: Signer,
): Promise<ERC8004Contracts> {
  const config = await assertERC8004Deployment(provider);
  if (signer) {
    if (!signer.provider) {
      throw new Error("ERC-8004 transaction signer must have a provider.");
    }
    const signerChainId = (await signer.provider.getNetwork()).chainId;
    if (signerChainId !== config.chainId) {
      throw new Error(
        `ERC-8004 signer chain mismatch: expected ${config.chainId}, got ${signerChainId}.`,
      );
    }
  }

  const runner = signer ?? provider;
  return {
    identity: new Contract(
      config.identityRegistry,
      ERC8004_ABIS.identity,
      runner,
    ),
    reputation: new Contract(
      config.reputationRegistry,
      ERC8004_ABIS.reputation,
      runner,
    ),
    validation: new Contract(
      config.validationRegistry,
      ERC8004_ABIS.validation,
      runner,
    ),
  };
}
