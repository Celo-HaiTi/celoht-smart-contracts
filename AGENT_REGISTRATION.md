# Agent registration

## Two identities, one profile link

CeloHT's existing `registerAgent()` and fee remain unchanged. An agent also
registers an ERC-721 identity in the official ERC-8004 Identity Registry.
Each registry assigns its own ID; the IDs are not interchangeable. The
`CeloHTERC8004IdentityLink` adapter associates one ID from each registry
without changing either existing registry.

The ERC-8004 registration file must include the fields in
[`schemas/erc8004-agent-registration.schema.json`](schemas/erc8004-agent-registration.schema.json):
`type`, `name`, `description`, `image`, `services`, `x402Support`, `active`,
and at least one `registrations` entry. `supportedTrust` is optional. The
`agentRegistry` value uses `eip155:<chainId>:<identityRegistryAddress>`.

[`agentRegistration.ts`](agentRegistration.ts) exports
`createAgentRegistrationFile()` and `validateAgentRegistrationFile()`.
These functions validate/build JSON only; they do not upload files or sign
transactions.

## Celo Sepolia flow

1. Connect the agent's wallet to chain `11142220`. Get registry addresses and
   ABIs from `deployments/erc8004.json` or the generated dApp config. Do not
   accept addresses supplied by a user or API as a substitute.
2. Register the wallet with the existing CeloHT Agent Registry if it is not
   already registered. This uses the existing USDm registration fee and
   approval flow.
3. Use the connected wallet to call the official Identity Registry's
   `register()` function. The ERC-8004 registry assigns its own `agentId` and
   sets the initial `agentWallet` to the caller. The user pays network gas;
   this integration adds no registration fee.
4. Build the JSON with the returned ERC-8004 ID and the registry address,
   publish it at a durable HTTPS or IPFS URI, then call `setAgentURI()` from
   the NFT owner or approved operator. Keep the profile pending until the URI
   resolves and its registration reference matches the on-chain ID/address.
5. Call `linkAgentIdentity(celoHTAgentId, erc8004AgentId)` from the
   CeloHT-registered wallet. That wallet must own or be an approved operator
   for the ERC-8004 token. Check `isLinkOwnerCurrent()` when reading profiles.
6. If the ERC-8004 NFT transfers, its `agentWallet` is cleared by the official
   registry. The CeloHT link does not transfer; the CeloHT wallet can unlink
   the stale mapping, after which a new valid link can be made if ownership
   and operator permissions permit it.

The standard uses a token ID in the registration JSON, but the ID is assigned
by the `register()` transaction. Therefore registration and URI publication
are two transactions. A UI/indexer must not show a complete ERC-8004
registration until it has checked both `ownerOf(agentId)` and `tokenURI(agentId)`
and validated the resolved JSON.

## Wallet and operator security

- Transaction signing is performed by the connected wallet. The repository
  contains no frontend or private-key storage.
- The official Identity Registry enforces ERC-721 owner/operator permissions
  for URI and metadata changes.
- Changing `agentWallet` requires a valid EIP-712 signature from the proposed
  receiving wallet (or EIP-1271 for a smart wallet) and an authorized
  transaction caller. It is not equivalent to changing NFT ownership.
- CeloHT Service Payments still pays the CeloHT registry wallet. Setting a
  different ERC-8004 `agentWallet` does not update that existing payment
  destination.

## History and discovery

Index the official `Registered`, ERC-721 `Transfer`, `URIUpdated`, and
`MetadataSet` events together with CeloHT `AgentRegistered` and adapter
`AgentIdentityLinked` / `AgentIdentityUnlinked`. Re-read current ownership,
URI, wallet metadata, and link validity from the respective contracts; event
history alone is not current state. Transaction links use the explorer for
the connected chain.

The backend, indexer, Supabase schema, and dApp are not in this repository.
This document defines the contract/client boundary; it does not claim those
external integrations are implemented.
