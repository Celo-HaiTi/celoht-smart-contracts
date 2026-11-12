# ERC-8004 deployment and activation guide

## Deployment policy

ERC-8004 Identity, Reputation, and Validation registries already exist on
Celo Sepolia and Celo Mainnet at the official project addresses in
[`deployments/erc8004.json`](deployments/erc8004.json). **Do not deploy
replacement ERC-8004 registries.** This project deploys only its separate
CeloHT identity-link adapter, and only through an explicit manual Sepolia
command. No Mainnet deployment command is provided.

## Phase 1 — Celo Sepolia

1. Review the pinned upstream source revision and registry addresses in
   [`ERC8004_INTEGRATION.md`](ERC8004_INTEGRATION.md). Confirm the configured
   RPC returns chain ID `11142220`.
2. Set `SEPOLIA_RPC_URL` if overriding the public Forno endpoint. Keep
   `PRIVATE_KEY` only in a secure local environment or GitHub Actions secret;
   never add it to frontend code, Supabase, or a manifest.
3. Run the existing tests and the read-only registry preflight:

   ```sh
   npm ci
   npm run compile
   npm test
   npm run check:erc8004
   ```

   The preflight validates chain ID, registry bytecode, ERC-721 support, and
   the Identity Registry addresses returned by the Reputation and Validation
   registries. Celo Sepolia Validation source verification is currently
   reported as false; resolve that before relying on it for production trust.

4. After review and explicit operator approval, manually deploy only the
   CeloHT link adapter:

   ```sh
   npm run deploy:erc8004-link
   ```

   It refuses Mainnet, checks the existing CeloHT Agent Registry and official
   Identity Registry, and refuses to overwrite an existing deployment record.
   Record and independently verify the emitted address and transaction.

5. Export the dApp-consumable configuration after deployment:

   ```sh
   npm run export:deployment
   ```

   The generated config contains official registry ABIs/addresses and shows
   the link adapter as `NOT DEPLOYED` until a real deployment record exists.

6. Use a connected wallet to run the registration, URI, link, feedback, and
   validation flows in [`AGENT_REGISTRATION.md`](AGENT_REGISTRATION.md),
   [`AGENT_REPUTATION.md`](AGENT_REPUTATION.md), and
   [`AGENT_VALIDATION.md`](AGENT_VALIDATION.md). Retain only confirmed chain
   receipts as successful transactions.

No live Sepolia write transaction is performed automatically by the test,
compile, export, or preflight commands.

## Phase 2 — Verify Mainnet registries

Use the read-only Mainnet network configuration and run:

```sh
npm run check:erc8004:mainnet
```

This command requires no transaction signer. Confirm the chain ID is `42220`,
code exists at all three official Mainnet addresses, Identity supports
ERC-721, and Reputation/Validation point at that Identity Registry. Repeat
the check immediately before activation because addresses and explorer
verification state are time-sensitive.

## Phase 3 — Prepare CeloHT Mainnet integration

This repository currently has no CeloHT Mainnet deployment manifest. Before
activation, maintainers must:

1. Complete all testnet integration and production-regression tests, including
   the linked profile and stale-link cases.
2. Integrate the client/config into the actual dApp, backend, indexer, and
   Supabase repositories; validate RLS, event replay/reorg behavior, explorer
   links, and wallet-only signing there.
3. Review the Celo Sepolia Validation implementation verification gap and
   complete an independent audit covering the registries, adapter, existing
   contracts, indexer, and user flows.
4. Prepare CeloHT Mainnet contracts, USDm, treasury, governance/Safe custody,
   role handoff, monitoring, incident response, and recovery runbooks under
   separate human approval. The existing `deployAll.ts` refuses Mainnet.
5. Confirm all Mainnet CeloHT addresses and chain IDs from deployed receipts,
   regenerate the deployment export, perform read-only preflight, then make
   a separately approved wallet-signed end-to-end transaction on Mainnet.

Do not announce Mainnet readiness until the on-chain test receipts,
verification evidence, external-repository integration tests, governance
handoff, and independent audit are complete.
