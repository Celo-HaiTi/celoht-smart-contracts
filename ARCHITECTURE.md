# CeloHT Smart Contracts — Architecture

## Status legend

Every claim in this document set uses one of these words deliberately:
**Implemented** · **Tested** · **Deployed** · **Verified** · **Audited** · **Pending**

As of this delivery: contracts are **Implemented** and **Tested**. Nothing is **Deployed**,
**Verified**, or **Audited**.

## Contracts

```
contracts/
├── CeloHTAgentRegistry.sol      Agent identity anchor + registration fee
├── CeloHTServicePayments.sol    P2P / Education / Reforestation service payments, 80/20 split
├── CeloHTEducation.sol          Certificate fee + lifecycle (payment → eligibility → issuance → verification → revocation)
├── CeloHTReforestation.sol      Voluntary USDm donations
├── CeloHTGovernance.sol         1-wallet-1-vote governance, advisory results
└── interfaces/                  One interface per contract, the DApp's stable contract surface
```

No CeloHTToken, no ERC-20 governance token, no staking contract exists anywhere in
this repository, by design.

## Design decision: Education split across two contracts

The spec's section 10 (Service Payments) prices "Education assistance" at 0.020
USDm with an 80/20 agent/treasury split, while section 11 (Education) also
references a 0.020 USDm "Education assistance" fee alongside a separate 0.010
USDm certificate fee. Rather than duplicate payment logic:

- **CeloHTServicePayments** owns the _agent-mediated_ Education assistance
  payment (0.020 USDm, 80/20 split) — because it is agent-mediated, like P2P.
- **CeloHTEducation** owns the _certificate_ fee and lifecycle exclusively
  (0.010 USDm, 100% to `EDUCATION_TREASURY`) — because certificate issuance
  is not agent-mediated and has no split.

This keeps each contract's revenue-distribution logic single-purpose and
auditable, per section 7's instruction to document any merge/split decision.

## Payment asset

All protocol payments use USDm. CELO is reserved for gas and is never accepted
as a service payment or converted from USDm pricing. Every contract holds an
`immutable` reference to the USDm token address set at construction — there is
no code path that accepts an arbitrary ERC-20.

USDm addresses (verified via CeloScan on 2026-08-30 — see `.env.example` for
full source notes):

- Mainnet: `0x765DE816845861e75A25fCA122bb6898B8B1282a` (the same proxy
  contract formerly labeled cUSD, rebranded "Mento Dollar (USDm)" by Mento).
- Alfajores testnet: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1` (confirmed
  live on Alfajores CeloScan and matches the address used in Celo's own
  official ContractKit→viem migration docs).

Both are re-verifiable independently at deployment time; do not treat this
document as the sole source of truth at the moment of a real deployment.

## Treasury

CeloHT Treasury Safe (confirmed): `0xd856e0599cc49C9cef6C358d2c2f064112A6b384`

**Configuration: Option A.** All four treasury categories —
`GENERAL_TREASURY`, `EDUCATION_TREASURY`, `REFORESTATION_TREASURY`,
`GOVERNANCE_TREASURY` — are intentionally configured to this same confirmed
Safe address. This is a deliberate, documented decision, not a missing
value: CeloHT currently operates one treasury Safe, and the protocol splits
payment flows into four _logical_ categories on-chain (via four independent
`treasury` state variables, one per contract) without requiring four
physical Safes to exist yet.

Each contract (`CeloHTAgentRegistry`, `CeloHTServicePayments`,
`CeloHTEducation`, `CeloHTReforestation`, `CeloHTGovernance`) stores its own
`treasury` address independently and exposes a `setTreasury()` function
gated by `TREASURY_ADMIN_ROLE`. This means the Maintainer Council can later
route `EDUCATION_TREASURY`, `REFORESTATION_TREASURY`, or
`GOVERNANCE_TREASURY` to a separate, purpose-built Safe with a single
transaction per contract — no redesign, redeployment, or migration is
required. The architecture was built for eventual separation from the
start; Option A is simply today's chosen configuration of that
architecture, not a limitation of it.

All four addresses are loaded, validated (non-zero, well-formed), and
recorded in the deployment manifest through the single centralized
`config/deployConfig.ts` module — see "Configuration" below.

## Configuration

`config/deployConfig.ts` is the single source of truth for every address
`deployAll.ts`, `configureContracts.ts`, and `verifyContracts.ts` use. No
script reads `process.env` directly for an address and no address literal
is duplicated across files. `loadDeploymentConfig(networkName)`:

- requires `USDM_ADDRESS_CELO` / `USDM_ADDRESS_ALFAJORES` depending on
  network (per-network, since the two are genuinely different contracts on
  different chains — collapsing them into one variable would be incorrect);
- requires all four `*_TREASURY` variables for any real network (`celo` or
  `alfajores`) and validates each is a well-formed, non-zero address;
- throws a clear, explicit error and refuses to proceed if anything is
  missing or malformed — it never substitutes a different address.

## Agent system

`registerAgent()` charges a fixed 0.20 USDm fee and mints a sequential agent
ID tied 1:1 to the calling wallet. Only `agentId`, `wallet`, `registeredAt`,
`active`, and `verified` are stored. `verified` reflects an **off-chain**
identity-verification result set by `AGENT_ADMIN_ROLE` — this contract never
performs identity verification itself and stores no personal data.

## Education

See "Design decision" above. Certificates are plain structs with a unique
sequential ID, not ERC-721 tokens, to avoid implying they are transferable or
tradeable assets. Payment never auto-issues a certificate: `payCertificateFee`
only increments `eligiblePaymentsRemaining[recipient]`; a separate,
role-gated `issueCertificate` call consumes one unit of eligibility.

## Reforestation

`donate()` is a pure pass-through to `REFORESTATION_TREASURY` with full
accounting (`totalDonated`, `donationCount`, per-donor totals). No token is
minted. No trees-per-USDm ratio is claimed on-chain, consistent with
reforestation still being in a design/pilot phase at the CeloHT protocol
level.

## Governance

Strictly 1 wallet = 1 vote. There is no governance token and voting power is
never derived from any balance. The 0.010 USDm participation fee is fixed —
paying it does not scale vote weight, and the contract has no code path that
would let it. **Governance results are advisory.** `CeloHTGovernance` counts
and finalizes votes only; it holds no privileged link to any treasury and
cannot execute a transfer, role change, or parameter change as a side effect
of a vote. Any future binding execution step must be a separate, explicitly
documented, Safe/multisig-compatible integration — see "Governance Security"
below.

Proposal creation is gated by `PROPOSER_ROLE` (a documented, reversible
policy choice — not fully permissionless — to bound spam while the community
is young; `DEFAULT_ADMIN_ROLE` can widen this role over time).

## Governance security

- No function in `CeloHTGovernance` moves treasury funds other than the
  fixed per-vote participation fee.
- No function grants a proposal automatic authority over any other contract.
- Treasury address changes across all five contracts require
  `TREASURY_ADMIN_ROLE`, reject the zero address, and emit an event.
- Treasury custody itself (the Safe at `GENERAL_TREASURY`) is external to
  this repository and remains multisig-controlled; these contracts only ever
  transfer funds _to_ configured treasury addresses, never manage the
  treasury's own multisig logic.

## Access control

| Role                    | Held by (initial) | Controls                                    |
| ----------------------- | ----------------- | ------------------------------------------- |
| `DEFAULT_ADMIN_ROLE`    | deployer/admin    | role assignment                             |
| `AGENT_ADMIN_ROLE`      | admin             | agent status/verification, registration fee |
| `TREASURY_ADMIN_ROLE`   | admin             | treasury address (per contract)             |
| `FEE_ADMIN_ROLE`        | admin             | service/certificate prices, split bps       |
| `EDUCATION_ISSUER_ROLE` | admin             | certificate issuance/revocation             |
| `GOVERNANCE_ADMIN_ROLE` | admin             | participation fee                           |
| `PROPOSER_ROLE`         | admin             | proposal creation                           |

In production, `DEFAULT_ADMIN_ROLE` and the specialized admin roles should be
transferred to the Maintainer Council's Safe rather than remain on a single
EOA — this repository ships the roles but does not perform that transfer,
since it depends on the actual multisig address (see `docs/DEPLOYMENT.md`).
