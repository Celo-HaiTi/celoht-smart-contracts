# CeloHT Smart Contracts

Production-grade Celo protocol infrastructure for CeloHT (Celo-HaiTi):
Agent Network, Service Payments, Education, Reforestation, and Governance
all settled in USDm, with no CeloHT token.

**Status: rebuilt from scratch, source-complete, not yet compiled/tested/deployed
in this delivery.** See `docs/SECURITY.md` for exactly what has and hasn't been
verified, and run the quality gate below before trusting this code.

## ⚠️ Before you deploy to testnet
Celo has deprecated Alfajores in favor of **Celo Sepolia Testnet**. See
`docs/DEPLOYMENT.md` → "Network Status Advisory" before choosing a testnet
— this repo supports both, but only Alfajores has a verified USDm address
in this delivery.

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
scripts/               deployAll / configureContracts / verifyContracts / exportDeployment
deployments/           machine-readable manifests (empty until a real deployment runs)
docs/                  ARCHITECTURE, SECURITY, THREAT_MODEL, DEPLOYMENT,
                        PROTOCOL_SPECIFICATION, DUNE_ANALYTICS, ENGINEERING_ASSESSMENT
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
