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
 * USDm is intentionally kept per-network (USDM_ADDRESS_CELO /
 * USDM_ADDRESS_ALFAJORES) rather than a single USDm_ADDRESS variable,
 * because the genuine mainnet and testnet USDm contracts are different
 * addresses on different chains. Using one variable for both would be
 * incorrect, not simpler. Both values are pre-verified; see the
 * VERIFICATION notes below and in .env.example.
 */

export interface DeploymentConfig {
  usdm: string;
  generalTreasury: string;
  educationTreasury: string;
  reforestationTreasury: string;
  governanceTreasury: string;
}

/** VERIFIED 2026-08-30 via CeloScan (celoscan.io/token/0x765de816845861e75a25fca122bb6898b8b1282a).
 *  Same proxy contract formerly labeled cUSD; rebranded "Mento Dollar (USDm)" by Mento. Decimals: 18.
 *  Re-verify independently before relying on this for a real Mainnet deployment. */
export const USDM_ADDRESS_CELO_VERIFIED =
  "0x765DE816845861e75A25fCA122bb6898B8B1282a";

/** VERIFIED 2026-08-30 via CeloScan Alfajores (alfajores.celoscan.io/token/0x874069fa1eb16d44d622f2e0ca25eea172369bc1)
 *  and Celo's own official docs (docs.celo.org ContractKit→viem migration example, which uses this
 *  exact address as `USDmAddress`). Same proxy contract, 18 decimals. Re-verify independently before
 *  relying on this for real testnet integration testing. */
export const USDM_ADDRESS_ALFAJORES_VERIFIED =
  "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

/** Confirmed CeloHT General Treasury Safe. Per repository policy (Option A), all four
 *  treasury categories are intentionally configured to this same confirmed address until
 *  the Maintainer Council stands up separate specialized Safes. This is a deliberate,
 *  documented choice — not a placeholder and not a missing value. */
export const CONFIRMED_CELOHT_TREASURY =
  "0xd856e0599cc49C9cef6C358d2c2f064112A6b384";

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
 * Loads and validates the full deployment configuration for the given
 * network name ("celo" | "alfajores" | anything else for local/hardhat).
 * Fails fast and loudly if a required real-network address is missing or
 * malformed — it never falls back to a different address silently.
 */
export function loadDeploymentConfig(networkName: string): DeploymentConfig {
  const isRealNetwork =
    networkName === "celo" ||
    networkName === "alfajores" ||
    networkName === "celoSepolia";

  let usdm: string;
  if (networkName === "celo") {
    usdm = requireValidAddress(
      "USDM_ADDRESS_CELO",
      requireEnv("USDM_ADDRESS_CELO"),
    );
  } else if (networkName === "alfajores") {
    usdm = requireValidAddress(
      "USDM_ADDRESS_ALFAJORES",
      requireEnv("USDM_ADDRESS_ALFAJORES"),
    );
  } else if (networkName === "celoSepolia") {
    // NOT independently verified in this delivery — see .env.example. Deployment will
    // fail here (by design) until a real, verified address is supplied.
    usdm = requireValidAddress(
      "USDM_ADDRESS_CELO_SEPOLIA",
      requireEnv("USDM_ADDRESS_CELO_SEPOLIA"),
    );
  } else {
    // Local/hardhat network — no real USDm exists; caller (deployAll.ts) deploys MockUSDm instead.
    usdm = "";
  }

  if (!isRealNetwork) {
    return {
      usdm,
      generalTreasury: "",
      educationTreasury: "",
      reforestationTreasury: "",
      governanceTreasury: "",
    };
  }

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
