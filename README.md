# CeloHT Smart Contracts

Production-grade Celo protocol infrastructure for CeloHT (Celo-HaiTi):
Agent Network, Service Payments, Education, Reforestation, and Governance
all settled in USDm, with no CeloHT token.

## Status

✅ Verified locally in this repo on 2026-09-01.
- Hardhat compile passes
- Test suite passes: 89 passing
- Repo is committed and pushed to GitHub
- Live deployment to Celo Sepolia is prepared, but not operational until the deployer wallet has CELO to pay gas and the human approves the network action

## Deployment status

The repo is ready for a real network deployment once the environment is funded and approved:
- Sepolia is the active canonical testnet in this repo
- USDm address for Celo Sepolia is configured to a verified public contract
- Wallet preflight checks and deployment guards are in place
- Live deployment still requires a funded deployer wallet and explicit deployment approval

## Before you deploy

1. Copy `.env.example` to `.env` and fill in real values.
2. Confirm the deployer wallet has CELO on the target network.
3. Run the preflight check:

```bash
npx hardhat run checkDeploymentReady.ts --network celoSepolia
```

4. If ready, deploy:

```bash
npx hardhat run deployAll.ts --network celoSepolia
```

## Quick start

```bash
cp .env.example .env
npm install
npx hardhat compile
npx hardhat test
npx hardhat coverage
```

## Repository layout

```
contracts/            core Solidity contracts and interfaces
test/                 Hardhat/TypeScript tests and fixtures
checkDeploymentReady.ts  preflight wallet/config guard before live deployment
deployAll.ts          live deployment script
deployConfig.ts       centralized address validation for real networks
verifyContracts.ts    contract verification flow
artifacts/            generated compile artifacts
```

## Core rules
- No CeloHT token, ever: no ERC-20, governance token, reward token, or staking.
- All payments in USDm; CELO is gas only.
- 80/20 agent/treasury split on paid P2P and Education assistance payments, enforced on-chain.
- Governance: 1 wallet = 1 vote, no token-weighted voting, advisory results.
- Celo Sepolia is the canonical testnet path in this repo; mainnet is a separate explicit operation.

## License
Apache-2.0 - see `LICENSE`.

## Contact
contact@celoht.com · celoht3@gmail.com · celoht.com · github.com/Celo-HaiTi
