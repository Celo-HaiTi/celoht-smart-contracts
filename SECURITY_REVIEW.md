# ERC-8004 integration security review

## Scope and status

This is a scoped engineering review of the integration changes in this
contracts repository, not an independent audit, formal verification, or
production security certification. It covers registry address selection,
chain checks, wallet/ownership boundaries, registration metadata, reputation,
validation, and the CeloHT identity-link adapter.

## Verified external deployment facts

The official ERC-8004 repository pins the Celo Sepolia and Celo Mainnet
addresses in `scripts/addresses.ts`. Blockscout's address API reported code
and proxy information for all six addresses on 2026-11-12. Its reported source
verification state is stored per registry in
[`deployments/erc8004.json`](deployments/erc8004.json):

- Celo Sepolia Identity and Reputation source verified; Validation proxy
  present but implementation source not verified.
- Celo Mainnet Identity, Reputation, and Validation source verified.

The runtime preflight additionally checks actual chain ID, non-empty bytecode,
ERC-721 support, and that Reputation and Validation reference the configured
Identity Registry. It does not independently verify implementation bytecode
against the GitHub source or replace a new on-chain test.

## Controls implemented

- No ERC-8004 registry implementation is deployed by CeloHT; the integration
  uses the official addresses and ABI-shaped interfaces.
- Mainnet Hardhat network configuration has no signer account. The existing
  deployment script remains Sepolia-only.
- Registry factory rejects unknown/mismatched chain IDs and checks the three
  registries before returning transaction-capable contracts.
- The identity link checks both deployed contract addresses have bytecode,
  requires the CeloHT agent wallet, requires that wallet to be an ERC-8004
  owner or approved operator, enforces one-to-one links, and exposes a
  live authorization check for transfer-stale links.
- Existing CeloHT Agent Registry and Service Payments interfaces and
  addresses are not changed.
- Registration-file builder checks the required ERC-8004 fields and
  JSON-safe agent ID. Files, feedback evidence, and validation evidence are
  off-chain content; their hashes and URIs must be checked by consumers.
- Wallet transactions are signed by an explicitly supplied signer. No key is
  read from a database, frontend bundle, or registration file.

## Residual risks and blockers

1. **Sepolia Validation implementation is unverified at the explorer.**
   Although the address is in the official project address list and has
   deployed proxy code, verify its implementation/source and
   `getIdentityRegistry()` result before treating it as production-trustworthy.
2. **No live write test has been performed by this change.** A read-only
   preflight and local unit tests do not prove successful Sepolia registration,
   feedback, validation, or indexer/database synchronization.
3. **Linking does not synchronize ownership.** ERC-721 transfer does not
   transfer the existing CeloHT registration. Consumers must re-check
   `isLinkOwnerCurrent()` and treat stale links as untrusted until repaired.
4. **ERC-8004 `agentWallet` is independent of the CeloHT payment wallet.**
   Updating ERC-8004 metadata does not change Service Payments recipients.
5. **Sybil and validator risks are inherent.** Reputation is permissionless;
   validator independence and evidence correctness are not enforced by the
   registry.
6. **No backend, indexer, Supabase, or dApp source is present** in this
   checkout. Those components still need their own security review and
   transaction/event synchronization tests.
7. **No independent security audit has been performed.** Existing project
   dependency and admin-custody blockers in [`SECURITY.md`](SECURITY.md) also
   remain.

## Required pre-production evidence

- Run `npm run check:erc8004` against Celo Sepolia and confirm all registry
  bindings.
- Complete wallet-signed Sepolia registration, URI update, wallet verification,
  feedback/revocation, and validator request/response transactions; retain
  real transaction hashes and receipts.
- Deploy the identity-link adapter once on Sepolia and verify its source.
- Test event indexing, reorg handling, Supabase persistence/RLS, and dApp
  display in their owning repositories.
- Resolve the unverified Sepolia Validation proxy and obtain an independent
  audit of the full deployed system before any production claim.
