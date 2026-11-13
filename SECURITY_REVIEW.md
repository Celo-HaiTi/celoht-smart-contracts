# ERC-8004 integration security review

## Scope and status

This is an engineering review of the integration in this contracts
repository, not an independent audit, formal verification, or production
security certification. Mainnet deployment is prohibited until an
independent external audit has been completed and approved.

The read-only Celo Sepolia preflight succeeded on 2026-11-12. No live ERC-8004
write transactions or CeloHT identity-link deployment were performed because
no dedicated test wallet key was available in this environment.

## Sepolia registry evidence

The three registry addresses match the pinned official repository address
list in [`deployments/erc8004.json`](deployments/erc8004.json). On chain ID
`11142220`, the preflight confirmed proxy bytecode, EIP-1967 implementation
slots and implementation bytecode, ERC-721 support on Identity, and
Identity Registry bindings from Reputation and Validation.

| Registry   | Proxy                                        | Implementation                               | Implementation bytecode |
| ---------- | -------------------------------------------- | -------------------------------------------- | ----------------------: |
| Identity   | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x7274e874CA62410a93Bd8bf61c69d8045E399c02` |            14,474 bytes |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | `0x16e0FA7f7C56B9a767E34B192B51f921BE31dA34` |            10,491 bytes |
| Validation | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` | `0xDB31f5d9167f8ebc8B30FbBF814c4d297c2D7F99` |             5,876 bytes |

Blockscout reports both each Sepolia proxy and implementation as
source-verified. The explorer implementation source for each registry was
compared with its source file at pinned upstream commit
`b9e466c250744a7e06b13dff9d3c2844ed64f825`; all three source files matched
byte-for-byte. The previously documented Validation source-verification gap
is resolved for this check date. Explorer verification is not a guarantee
against future proxy upgrades; re-read implementation slots before use.

## Controls and local coverage

- CeloHT does not deploy replacement ERC-8004 registries. The configuration
  rejects unknown/mismatched chain IDs and checks proxy/implementation code,
  ERC-721 support, and registry bindings before creating contract clients.
- The identity-link adapter requires code at both registry addresses, ERC-721
  support at the Identity Registry, an active CeloHT agent, the registered
  CeloHT wallet, and current ERC-8004 owner/operator authorization. It
  maintains a one-to-one mapping and exposes stale-link detection.
- The registration file validator enforces the ERC-8004 required fields and
  JSON-safe agent IDs. It does not upload content or sign transactions.
- Reputation and validation remain calls to external registries. Local ABI
  tests validate signatures and event shapes. The opt-in Hardhat fork suite
  exercises identity, reputation, and validation behavior against the
  deployed Sepolia implementation bytecode using a local simulation chain;
  it does not broadcast Sepolia transactions or replace live write tests.
- The adapter deployment script is Sepolia-only and refuses to overwrite an
  existing deployment record. Mainnet has no configured transaction signer.

## Remaining blockers and risks

1. **No live behavior transactions:** registration, URI update, wallet
   signature, feedback/revocation/response, validation request/response, and
   link/unlink flows still require a dedicated funded Sepolia test wallet,
   real receipts, emitted events, and verified resulting state.
2. **Identity-link adapter not deployed:** there is no deployment address or
   source-verification receipt for that adapter.
3. **Ownership is not synchronized across registries:** ERC-721 transfers do
   not transfer the CeloHT registration. Consumers must check
   `isLinkOwnerCurrent()` and repair stale links.
4. **Separate payment wallet:** changing ERC-8004 `agentWallet` does not
   change the CeloHT Service Payments recipient.
5. **Trust-model risks:** reputation is permissionless and susceptible to
   Sybil activity. The registry does not establish validator independence,
   competence, or evidence correctness.
6. **External systems are out of scope:** backend, indexer, Supabase, and dApp
   code are absent and need independent review, event/reorg tests, and
   transaction synchronization.
7. **No independent external audit has been completed.** Existing dependency,
   admin-custody, and deployment risks in [`SECURITY.md`](SECURITY.md) remain.

## Next steps before external audit

1. Use a dedicated test wallet on Celo Sepolia; run each safe write flow and
   retain transaction hashes, confirmed receipts, events, and state reads.
2. Deploy the link adapter only after verifying the CeloHT Agent Registry,
   official ERC-8004 Identity Registry, chain ID, and deployer funds. Verify
   the adapter source on Blockscout and test linking, unlinking, transfers,
   stale-link detection, and repair.
3. Complete backend/indexer/dApp integration and reorg, persistence/RLS, and
   event replay tests in their owning repositories.
4. Freeze the reviewed code and obtain an independent external audit. Resolve
   all findings and obtain explicit audit approval before any Mainnet action.
