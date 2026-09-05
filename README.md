# CeloHT Smart Contracts

CeloHT is a Celo-native protocol ecosystem for agent coordination, service payments, education support, reforestation incentives, and transparent governance. The system is designed around USDm settlement, with CELO used strictly for gas and network operations.

This repository contains the testnet-ready smart-contract stack and operational tooling for deploying and validating the protocol on supported Celo networks. Mainnet still requires an independent security audit and operational approval.

## Project status

Repository state as of 2026-09-05:

- Hardhat compilation succeeds
- Test suite passes: 105 tests passing
- Production dependency audit reports no known vulnerabilities
- Celo Sepolia deployment is recorded in `deployments/celoSepolia.json`
- The five deployed contracts are verified on Celo Sepolia Blockscout
- No independent third-party audit is claimed
- Mainnet deployment is not claimed or enabled

## Core protocol principles

- No CeloHT token is created or issued
- No governance token, reward token, or staking token is used
- USDm is the settlement asset for all functional payments
- CELO is treated as the network gas asset only
- On-chain rules enforce service split logic and governance constraints
- Mainnet deployment is intentionally explicit and not allowed by default

## System components

The protocol is organized around five smart-contract domains:

1. Agent Registry
   - Tracks agent identities, role assignments, and registry state
2. Service Payments
   - Handles settlement for paid services and split enforcement
3. Education
   - Manages educational support and assistance flows
4. Reforestation
   - Records and enforces reforestation-related activation and incentives
5. Governance
   - Enables wallet-based governance decisions without token-weighted voting

## Network and operational model

The repository is configured for Celo-based deployments with Celo Sepolia as the canonical testnet path.

Current testnet deployment status:

- Network: Celo Sepolia, chain ID `11142220`
- USDm: `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b`
- Treasury Safe: `0xd856e0599cc49C9cef6C358d2c2f064112A6b384`
- Contract addresses, deployment blocks, transaction hashes, and verification status are in the deployment manifest
- Deployment validation scripts enforce address correctness and environment checks for future manual deployments

## Deployment readiness

The repo is deployment-ready in code and tooling, but not operationally live until all real-world requirements are satisfied:

- valid environment variables loaded from `.env`
- funded deployer wallet with enough CELO for gas
- target network selected explicitly
- human approval to proceed with a live network action

## Prerequisites

- Node.js 18+
- npm
- Hardhat project dependencies
- `.env` file populated from `.env.example`
- funded wallet on the target network

## Quick start

```bash
cp .env.example .env
npm install
npx hardhat compile
npx hardhat test
npx hardhat coverage
```

## Before live deployment

1. Copy the example environment file and configure the real values:

```bash
cp .env.example .env
```

2. Make sure the deployer wallet has CELO for gas on the selected network.

3. Check wallet funding and recommended minimum balance:

```bash
npm run check:wallet
```

4. Run the deployment preflight validation:

```bash
npx hardhat run checkDeploymentReady.ts --network celoSepolia
```

5. Deploy the full protocol suite only when a new deployment is explicitly approved:

```bash
npx hardhat run deployAll.ts --network celoSepolia
```

The existing Celo Sepolia deployment must not be redeployed casually. The
deployment script refuses to overwrite an existing manifest, but it cannot
prevent a user from intentionally deploying to a fresh account or network.

## Repository structure

```text
.
├── contracts/                    # Solidity contracts and interfaces
├── test/                        # Hardhat and TypeScript tests
├── .env.example                 # Deployment environment template
├── checkDeploymentReady.ts      # Preflight validation for funded deployment
├── checkWalletBalance.ts        # Wallet balance and minimum-funding check
├── deployAll.ts                 # Full protocol deployment script
├── deployConfig.ts              # Centralized config validation for real networks
├── hardhat.config.ts            # Hardhat network and verification config
├── verifyContracts.ts           # Contract verification flow
├── deployments/celoSepolia.json # Traceable existing Sepolia deployment
├── deployments/dapp-config.json # DApp-consumable deployment export
├── package.json                 # Scripts and dependencies
├── README.md                    # Repository documentation
├── LICENSE                      # Apache-2.0 license
├── artifacts/                   # Generated compiler output
└── fixtures.ts                  # Test fixtures and shared setup
```

## Security and governance guardrails

The contracts and deployment workflow include deliberate safeguards to encourage safe, responsible protocol operation:

- strict address validation for environment configuration
- real-network deployment guardrails
- wallet balance checks before execution
- Celo Sepolia is the only configured live deployment target
- explicit operational approval before live deployment

## Contract verification

After deployment, verification should be performed using the project verification workflow and the correct network configuration.

## Contribution

This repository is intended for controlled protocol deployment and security
review workflows. `DEPLOYED` and `VERIFIED` describe the current Celo Sepolia
state; they do not mean `AUDITED` or `MAINNET READY`. Contributions should be
reviewed carefully, with emphasis on security, correctness, and deployment
safety.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

## Contact

- Email: contact@celoht.com
- Email: celoht3@gmail.com
- Web: celoht.com
- GitHub: github.com/Celo-HaiTi
