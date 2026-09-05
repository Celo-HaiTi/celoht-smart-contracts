import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

export const CELO_SEPOLIA_CHAIN_ID = 11142220;
export const CELO_SEPOLIA_RPC_URL =
  "https://forno.celo-sepolia.celo-testnet.org";

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || CELO_SEPOLIA_RPC_URL;

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
    celoSepolia: {
      url: sepoliaRpcUrl,
      chainId: CELO_SEPOLIA_CHAIN_ID,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      celoSepolia: process.env.BLOCKSCOUT_API_KEY || "",
    },
    customChains: [
      {
        network: "celoSepolia",
        chainId: CELO_SEPOLIA_CHAIN_ID,
        urls: {
          apiURL: "https://celo-sepolia.blockscout.com/api",
          browserURL: "https://celo-sepolia.blockscout.com",
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
