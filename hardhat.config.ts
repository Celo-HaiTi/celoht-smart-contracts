import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // ⚠️ NETWORK STATUS ADVISORY (verified 2026-08-30 via docs.celo.org and the Celo
    // Forum): Celo officially deprecated Alfajores in favor of "Celo Sepolia Testnet"
    // following the Holesky sunset on 2025-09-30. Alfajores was still reachable and
    // showed live transaction activity on CeloScan at verification time, but treat it
    // as at-risk — confirm current status at docs.celo.org/network before relying on
    // it for real testnet work. See docs/DEPLOYMENT.md "Network Status Advisory".
    alfajores: {
      url:
        process.env.ALFAJORES_RPC_URL ||
        "https://alfajores-forno.celo-testnet.org",
      chainId: 44787,
      accounts,
    },
    // Celo's officially recommended replacement testnet (verified 2026-08-30 via
    // docs.celo.org/tooling/testnets/celo-sepolia and multiple independent RPC
    // providers). USDM_ADDRESS_CELO_SEPOLIA is NOT independently verified in this
    // delivery — see .env.example. Do not deploy here until that address is confirmed.
    celoSepolia: {
      url:
        process.env.CELO_SEPOLIA_RPC_URL ||
        "https://forno.celo-sepolia.celo-testnet.org",
      chainId: 11142220,
      accounts,
    },
    celo: {
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      chainId: 42220,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      alfajores: process.env.CELOSCAN_API_KEY || "",
      celoSepolia: process.env.CELOSCAN_API_KEY || "",
      celo: process.env.CELOSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      {
        // Confirmed reachable at sepolia.celoscan.io (verified 2026-08-30). The exact
        // verify-API path was not independently confirmed in this delivery — test
        // `npx hardhat verify --network celoSepolia` once real bytecode exists and
        // adjust apiURL if it fails; do not assume this mirrors the Alfajores path.
        network: "celoSepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://api-sepolia.celoscan.io/api",
          browserURL: "https://sepolia.celoscan.io",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 120000,
  },
};

export default config;
