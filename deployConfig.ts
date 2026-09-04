import { isAddress, getAddress } from "ethers";

/**
 * Centralized deployment configuration.
 *
 * This is the ONLY place in the repository that reads USDM_* and
 * *_TREASURY environment variables. Every script (deployAll,
 * configureContracts, verifyContracts, exportDeployment) imports its
 * addresses from here — never duplicate an address literal or read
 * process.env directly in another script.
 *
 * Celo Sepolia is the only supported live deployment network.
 */

export interface DeploymentConfig {
  usdm: string;
  generalTreasury: string;
  educationTreasury: string;
  reforestationTreasury: string;
  governanceTreasury: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Deployment configuration must be ` +
        `explicit — this repository does not silently substitute a different address.`,
    );
  }
  return value;
}

function requireValidAddress(name: string, value: string): string {
  if (!isAddress(value)) {
    throw new Error(`${name}=${value} is not a valid Ethereum/Celo address.`);
  }
  const checksummed = getAddress(value);
  if (
    checksummed === getAddress("0x0000000000000000000000000000000000000000")
  ) {
    throw new Error(`${name} must not be the zero address.`);
  }
  return checksummed;
}

/**
 * Loads and validates the full deployment configuration for Celo Sepolia.
 * Fails fast and loudly if a required real-network address is missing or
 * malformed — it never falls back to a different address silently.
 */
export function loadDeploymentConfig(networkName: string): DeploymentConfig {
  if (networkName !== "celoSepolia") {
    throw new Error(
      "Unsupported deployment network. This repository targets Celo Sepolia only.",
    );
  }

  const usdm = requireValidAddress(
    "USDM_ADDRESS_CELO_SEPOLIA",
    requireEnv("USDM_ADDRESS_CELO_SEPOLIA"),
  );
  const generalTreasury = requireValidAddress(
    "GENERAL_TREASURY",
    requireEnv("GENERAL_TREASURY"),
  );
  const educationTreasury = requireValidAddress(
    "EDUCATION_TREASURY",
    requireEnv("EDUCATION_TREASURY"),
  );
  const reforestationTreasury = requireValidAddress(
    "REFORESTATION_TREASURY",
    requireEnv("REFORESTATION_TREASURY"),
  );
  const governanceTreasury = requireValidAddress(
    "GOVERNANCE_TREASURY",
    requireEnv("GOVERNANCE_TREASURY"),
  );

  return {
    usdm,
    generalTreasury,
    educationTreasury,
    reforestationTreasury,
    governanceTreasury,
  };
}
