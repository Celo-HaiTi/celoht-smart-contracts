# Deployment

## ⚠️ Network Status Advisory (verified 2026-08-30)

Celo has officially deprecated the **Alfajores** testnet in favor of a new
**Celo Sepolia Testnet** (chain ID `11142220`), following the Ethereum
Holesky sunset on 2025-09-30. Source: Celo's own documentation
(`docs.celo.org/tooling/testnets/celo-sepolia`, `docs.celo.org/network/alfajores`)
and the Celo Forum announcement "Introducing Celo Sepolia." Some
third-party infrastructure providers (Tatum, NOAH) already treat Alfajores
as fully decommissioned.

**This is a genuine, unresolved conflict between sources**, not something
this delivery can silently resolve: at verification time, Alfajores
CeloScan still showed live, recent transaction activity, and
`docs.celo.org/network/alfajores` still described Alfajores as Celo's
"primary public developer testnet" — with a banner pointing developers to
Sepolia. Per the source-of-truth priority in this task (on-chain state and
official docs first), the honest summary is: **Alfajores is officially
being sunset, but was not fully dead at verification time.**

Practical guidance:

- `hardhat.config.ts` now defines all three networks: `alfajores` (legacy,
  at-risk), `celoSepolia` (Celo's recommended replacement), and `celo`
  (Mainnet).
- `USDM_ADDRESS_CELO_SEPOLIA` in `.env.example` is intentionally **empty**
  — no USDm/Mento token contract address on Celo Sepolia was independently
  verified in this delivery. `config/deployConfig.ts` will refuse to
  deploy to `celoSepolia` until this is filled in with a real, verified
  address. Do not reuse the Alfajores or Mainnet USDm address here; they
  are different contracts on different chains.
- Before doing real testnet work, check `docs.celo.org/network` yourself
  for the current status of both testnets — this advisory could itself be
  stale by the time you read it.

## Order of operations (do not skip steps)

1. **Local quality gate** — run everything in `SECURITY.md`'s command
   block locally. Fix all compile errors and failing tests first.
2. **Testnet first, always.** Deploy to Celo Sepolia (`--network celoSepolia`).
   Never deploy to Mainnet directly.
3. Run `configureContracts.ts` against the testnet deployment and
   confirm every treasury address matches what you intended.
4. Run `verifyContracts.ts` against testnet and confirm Celoscan
   reports the contracts as verified — check the explorer yourself, don't
   just trust the script's console output.
5. Exercise every flow for real on testnet: agent registration, a P2P
   payment, an Education payment, certificate fee + issuance + verification
   - revocation, a reforestation donation, and a full governance proposal
     lifecycle (create → vote YES/NO/ABSTAIN → finalize).
6. Only after all of the above is genuinely done — plus a security review
   and, ideally, an independent audit — consider Mainnet.
7. Mainnet deployment requires `MAINNET_DEPLOY_CONFIRM=YES` to be set
   explicitly (see `deployAll.ts`); the script refuses to run
   against `celo` network otherwise. This is a deliberate friction point,
   not a bug.
8. After a real Mainnet deployment: verify source code, confirm optimizer
   settings and constructor arguments on Celoscan, update
   `deployments/celo-mainnet.json`, run `exportDeployment.ts`, and update
   the CeloHT DApp's configuration to point at the new manifest.

## Required configuration before any deployment

Copy `.env.example` to `.env` and fill in:

- `DEPLOYER_PRIVATE_KEY` — a dedicated deployment key, never a personal or
  treasury-holding wallet.
- `ALFAJORES_RPC_URL` / `CELO_RPC_URL`
- `CELOSCAN_API_KEY`
- `USDM_ADDRESS_ALFAJORES` — verified in this delivery as
  `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1` (see `docs/ARCHITECTURE.md`);
  re-confirm on `alfajores.celoscan.io` at deployment time regardless.
- `USDM_ADDRESS_CELO` — verified in this delivery as
  `0x765DE816845861e75A25fCA122bb6898B8B1282a` (see `docs/ARCHITECTURE.md`);
  re-confirm at deployment time regardless.
- `GENERAL_TREASURY`, `EDUCATION_TREASURY`, `REFORESTATION_TREASURY`,
  `GOVERNANCE_TREASURY` — all four are pre-filled with the confirmed CeloHT
  Treasury Safe address (`0xd856e0599cc49C9cef6C358d2c2f064112A6b384`),
  per the Option A configuration described in `docs/ARCHITECTURE.md`. All
  four are required by `config/deployConfig.ts` for any real-network
  deployment — the deployment script will refuse to run if any is missing.

## Admin key handoff

All five contracts grant `DEFAULT_ADMIN_ROLE` (and the specialized admin
roles) to the deploying address. Before Mainnet is considered
production-configured, transfer these roles to the Maintainer Council's Safe
using OpenZeppelin `AccessControl`'s `grantRole` / `renounceRole`, and
document the transaction hashes in the deployment manifest. This repository
does not perform that transfer automatically, since it depends on a real
multisig address that must come from CeloHT governance, not from this
codebase.
