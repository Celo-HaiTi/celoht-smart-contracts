# CeloHT Smart Contracts

Production-grade Celo protocol infrastructure for CeloHT (Celo-HaiTi):
Agent Network, Service Payments, Education, Reforestation, and Governance
all settled in USDm, with no CeloHT token.

**Status: compiled and test-passing in this session; no real network deployment was
performed.** The contract suite and invariants were executed locally and passed on
2026-09-01. Real deployment and on-chain verification remain gated behind a
verified environment and an explicit human deployment decision.

## ⚠️ Before you deploy to testnet
Celo has deprecated Alfajores in favor of **Celo Sepolia Testnet**. See
`DEPLOYMENT.md` → "Network Status Advisory" before choosing a testnet. This repo
supports both network labels in config, but only a verified USDm address should be
used for a real deployment.

## Quick start

```bash
cp .env.example .env    # fill in real values — see comments in the file
npm install
npx hardhat compile
npx hardhat test
npx hardhat coverage
```

## Repository layout

```
contracts/            5 core contracts + interfaces + test-only mocks
test/                 Hardhat/TypeScript test suite (per-contract + invariant sweep)
root files            deployAll.ts / configureContracts.ts / verifyContracts.ts / exportDeployment.ts / deployConfig.ts
artifacts/            generated compile artifacts
typechain-types/      generated ethers-v6 typings
```

## Core rules
- No CeloHT token, ever no ERC-20, governance token, reward token, or staking.
- All payments in USDm; CELO is gas only.
- 80/20 agent/treasury split on paid P2P and Education-assistance payments, enforced on-chain.
- Governance: 1 wallet = 1 vote, no token-weighted voting, advisory results.
- Testnet (Alfajores) first, always. Mainnet is a separate, explicitly gated operation.

## License
Apache-2.0 - see `LICENSE`.

## Contact
contact@celoht.com · celoht3@gmail.com · celoht.com · github.com/Celo-HaiTi
