import { isAddress } from "ethers";
import { getERC8004NetworkConfig } from "./erc8004Config";

export const ERC8004_REGISTRATION_TYPE =
  "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface AgentRegistrationReference {
  agentId: number;
  agentRegistry: string;
}

export interface AgentRegistrationFile {
  type: typeof ERC8004_REGISTRATION_TYPE;
  name: string;
  description: string;
  image: string;
  services: AgentService[];
  x402Support: boolean;
  active: boolean;
  registrations: AgentRegistrationReference[];
  supportedTrust?: string[];
}

export interface CreateAgentRegistrationInput {
  chainId: bigint | number;
  agentId: bigint | number;
  name: string;
  description: string;
  image: string;
  services: AgentService[];
  x402Support: boolean;
  active: boolean;
  supportedTrust?: string[];
}

export function createAgentRegistrationFile(
  input: CreateAgentRegistrationInput,
): AgentRegistrationFile {
  const config = getERC8004NetworkConfig(input.chainId);
  const agentId = Number(input.agentId);
  if (!Number.isSafeInteger(agentId) || agentId < 0) {
    throw new Error(
      "ERC-8004 agentId must be a non-negative, JSON-safe integer.",
    );
  }

  const registration: AgentRegistrationFile = {
    type: ERC8004_REGISTRATION_TYPE,
    name: input.name,
    description: input.description,
    image: input.image,
    services: input.services,
    x402Support: input.x402Support,
    active: input.active,
    registrations: [
      {
        agentId,
        agentRegistry: `eip155:${config.chainId}:${config.identityRegistry}`,
      },
    ],
  };
  if (input.supportedTrust !== undefined) {
    registration.supportedTrust = input.supportedTrust;
  }

  validateAgentRegistrationFile(registration);
  return registration;
}

export function validateAgentRegistrationFile(
  value: unknown,
): asserts value is AgentRegistrationFile {
  if (!isRecord(value)) {
    throw new Error("Agent registration file must be a JSON object.");
  }
  if (value.type !== ERC8004_REGISTRATION_TYPE) {
    throw new Error("Agent registration file has an invalid ERC-8004 type.");
  }
  for (const field of ["name", "description", "image"] as const) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      throw new Error(`Agent registration file requires a non-empty ${field}.`);
    }
  }
  if (!Array.isArray(value.services)) {
    throw new Error("Agent registration file requires a services array.");
  }
  for (const [index, rawService] of value.services.entries()) {
    if (!isRecord(rawService)) {
      throw new Error(`Agent service ${index} must be a JSON object.`);
    }
    if (
      typeof rawService.name !== "string" ||
      rawService.name.trim().length === 0 ||
      typeof rawService.endpoint !== "string" ||
      rawService.endpoint.trim().length === 0
    ) {
      throw new Error(
        `Agent service ${index} requires non-empty name and endpoint fields.`,
      );
    }
    if (
      rawService.version !== undefined &&
      typeof rawService.version !== "string"
    ) {
      throw new Error(`Agent service ${index} version must be a string.`);
    }
    for (const field of ["skills", "domains"] as const) {
      if (
        rawService[field] !== undefined &&
        (!Array.isArray(rawService[field]) ||
          !rawService[field].every((item) => typeof item === "string"))
      ) {
        throw new Error(
          `Agent service ${index} ${field} must be a string array.`,
        );
      }
    }
  }
  if (
    typeof value.x402Support !== "boolean" ||
    typeof value.active !== "boolean"
  ) {
    throw new Error(
      "Agent registration file requires boolean x402Support and active fields.",
    );
  }
  if (!Array.isArray(value.registrations) || value.registrations.length === 0) {
    throw new Error(
      "Agent registration file requires at least one registration reference.",
    );
  }
  for (const [index, rawReference] of value.registrations.entries()) {
    if (!isRecord(rawReference)) {
      throw new Error(`Registration reference ${index} must be a JSON object.`);
    }
    if (
      typeof rawReference.agentId !== "number" ||
      !Number.isSafeInteger(rawReference.agentId) ||
      rawReference.agentId < 0 ||
      typeof rawReference.agentRegistry !== "string"
    ) {
      throw new Error(
        `Registration reference ${index} has an invalid agentId or agentRegistry.`,
      );
    }
    const match = /^eip155:(\d+):(0x[0-9a-fA-F]{40})$/.exec(
      rawReference.agentRegistry,
    );
    if (!match || !isAddress(match[2])) {
      throw new Error(
        `Registration reference ${index} must use eip155:<chainId>:<identityRegistry>.`,
      );
    }
  }
  if (
    value.supportedTrust !== undefined &&
    (!Array.isArray(value.supportedTrust) ||
      !value.supportedTrust.every((item) => typeof item === "string"))
  ) {
    throw new Error("supportedTrust must be a string array when present.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
