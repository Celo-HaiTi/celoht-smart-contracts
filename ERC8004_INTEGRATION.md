# ERC-8004 integration

## Status and scope

CeloHT now has Solidity interfaces and a client configuration for the official
ERC-8004 Identity, Reputation, and Validation registries; a registration-file
builder/validator; and a separate, permissionless CeloHT-to-ERC-8004 identity
link contract. Existing CeloHT registry and payment interfaces are unchanged.
The link contract is not an ERC-8004 registry and does not copy or deploy one.

The official registry proxies are already deployed on Celo Sepolia and Celo
Mainnet. Their addresses are recorded in [`deployments/erc8004.json`](deployments/erc8004.json)
and pinned to the official
[`erc-8004-contracts` source revision](https://github.com/erc-8004/erc-8004-contracts/tree/b9e466c250744a7e06b13dff9d3c2844ed64f825).
The addresses are configured for read-only preflight and wallet-signed use;
this repository does not redeploy the registries.

| Network      |   Chain ID | Identity Registry                                                                                                                      | Reputation Registry                                                                                                                    | Validation Registry                                                                                                                    |
| ------------ | ---------: | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Celo Sepolia | `11142220` | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://celo-sepolia.blockscout.com/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://celo-sepolia.blockscout.com/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) | [`0x8004Cb1BF31DAf7788923b405b754f57acEB4272`](https://celo-sepolia.blockscout.com/address/0x8004Cb1BF31DAf7788923b405b754f57acEB4272) |
| Celo Mainnet |    `42220` | [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://celo.blockscout.com/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)         | [`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`](https://celo.blockscout.com/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63)         | [`0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`](https://celo.blockscout.com/address/0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58)         |

Blockscout reports deployed code for all six proxies. Identity and Reputation
are source-verified on both networks. Validation is source-verified on Celo
Mainnet; the Celo Sepolia Validation proxy is listed by the official project
but its implementation source was not verified on Blockscout at the time this
configuration was checked. The preflight checks chain ID, bytecode, ERC-721
support, and that both trust registries point at the configured identity
registry. This is not a substitute for source review or a live write test.

## Integration boundary

- [`CeloHTAgentRegistry`](contracts/CeloHTAgentRegistry.sol) remains the source
  for CeloHT registration, its fee, activation, and its wallet-bound agent ID.
- The official ERC-8004 Identity Registry remains the source for transferable
  ERC-721 agent IDs, registration URIs, metadata, wallet verification, and NFT
  owner/operator permissions.
- [`CeloHTERC8004IdentityLink`](contracts/CeloHTERC8004IdentityLink.sol)
  records a one-to-one link only when the caller is the CeloHT registered
  wallet and is also the ERC-8004 owner or an approved operator. It checks the
  official registry at link time and exposes a live ownership/authorization
  check so consumers can detect a stale link after an NFT transfer.
- Existing Service Payments continue to use the wallet in the existing
  CeloHT registry. An ERC-8004 `agentWallet` change does not silently reroute
  CeloHT payments or change the deployed payment contract.
- Reputation and validation transactions go directly to the official
  registries using their standard ABIs. The client factory accepts a provider
  and optional wallet signer; it never loads a private key.

## Repository limits

This checkout contains Solidity contracts and deployment tooling only. It has
no backend, indexer, Supabase migrations, or dApp source. The generated
[`exportDeployment.ts`](exportDeployment.ts) script now includes ERC-8004
addresses and ABIs in its output, and marks the link contract `NOT DEPLOYED`
until a separate manual Sepolia deployment. The committed
[`deployments/dapp-config.json`](deployments/dapp-config.json) has not yet been
regenerated or validated. No backend/database synchronization or production UI
is claimed by this repository change.

## Verification commands

```sh
npm run compile
npm test
npm run check:erc8004
npm run export:deployment
```

`check:erc8004` is read-only. `deploy:erc8004-link` is a separate manual
Sepolia-only transaction that deploys only the CeloHT link adapter, not any
ERC-8004 registry. See [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) before
running it.

See [`AGENT_REGISTRATION.md`](AGENT_REGISTRATION.md),
[`AGENT_REPUTATION.md`](AGENT_REPUTATION.md),
[`AGENT_VALIDATION.md`](AGENT_VALIDATION.md), and
[`SECURITY_REVIEW.md`](SECURITY_REVIEW.md) for the corresponding flows and
limitations.
