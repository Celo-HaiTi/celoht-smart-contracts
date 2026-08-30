# CeloHT Smart Contracts — Engineering Assessment

## Architecture

Five focused contracts, each with a matching interface, cover the protocol's
three permanent pillars plus the two contracts that make them payable and
governable: `CeloHTAgentRegistry` (agent identity), `CeloHTServicePayments`
(agent-mediated payments + 80/20 split), `CeloHTEducation` (certificate fee
and lifecycle), `CeloHTReforestation` (voluntary donations), and
`CeloHTGovernance` (1-wallet-1-vote, advisory). Full rationale for the one
deliberate structural decision (splitting "education assistance" payment
from "certificate" lifecycle across two contracts) is in
`docs/ARCHITECTURE.md`.

## Payment model

Every protocol payment settles in USDm, referenced as an `immutable` address
per contract set at construction — there is no configuration path that lets
a different token be substituted post-deployment, and no function accepts an
arbitrary ERC-20 as payment. CELO never enters any pricing calculation; it
is exclusively the network's gas asset. This is enforced by contract
structure, not by convention: the contracts simply have no CELO-handling
code at all (no `payable` functions, no `msg.value` usage anywhere).

## Treasury

`GENERAL_TREASURY`, `EDUCATION_TREASURY`, `REFORESTATION_TREASURY`, and
`GOVERNANCE_TREASURY` are all configured to the confirmed CeloHT Treasury
Safe (`0xd856e0599cc49C9cef6C358d2c2f064112A6b384`) — Option A, a deliberate
current-state decision, not a placeholder. Each contract stores its
treasury address independently and exposes `setTreasury()`, so separating
these into distinct Safes later is a configuration change, not a redesign.
All four addresses are loaded and validated through the single
`config/deployConfig.ts` module; no script duplicates an address literal or
reads `process.env` directly.

## Agent system

Registration is a single fee-gated transaction that mints a sequential agent
ID bound 1:1 to a wallet, preventing duplicate registrations. Paid-service
revenue checks `isAgentActive` before any transfer, so a deactivated agent
cannot continue collecting revenue even if a stale reference to their agent
ID is used client-side.

## Education

Payment and issuance are deliberately decoupled: `payCertificateFee`
increments an eligibility counter; only an `EDUCATION_ISSUER_ROLE` holder can
convert that eligibility into an actual, uniquely-IDed certificate via
`issueCertificate`. Certificates can be revoked with a reason, and
`isValidCertificate` gives the DApp a single source of truth for on-chain
verification.

## Reforestation

`donate()` is minimal by design: it validates a nonzero amount, records the
donation with a unique ID, updates running totals, and forwards the full
amount to the reforestation treasury. No environmental token, no
per-USDm tree claim — consistent with reforestation still being in a
design/pilot phase for CeloHT as an organization.

## Governance

`1 wallet = 1 vote` is enforced structurally: the tally logic increments a
fixed integer per vote regardless of the participation fee amount, and there
is no code path where fee size affects vote weight. The 0.010 USDm
participation fee exists purely as a spam-resistance/sustainability
mechanism. Results are advisory: `CeloHTGovernance` has no reference to, or
privileged access over, any treasury-holding contract, so a vote outcome
cannot itself move funds or change roles anywhere else in the system.

## What this delivery does and does not include

**Included**: complete Solidity source for all five contracts and five
interfaces; a Hardhat/TypeScript project configuration; a real test suite
covering the protocol invariants listed in the spec (registration,
duplicate prevention, inactive-agent rejection, exact 80/20 accounting
including a parameter sweep, certificate lifecycle, donation accounting,
one-wallet-one-vote, voting-window enforcement, access-control gating);
deployment and verification scripts with explicit Mainnet safety gating;
and the full documentation set requested (`ARCHITECTURE`, `SECURITY`,
`THREAT_MODEL`, `DEPLOYMENT`, `PROTOCOL_SPECIFICATION`, `DUNE_ANALYTICS`,
this file).

**Not included, and not claimed**: an actual `npm install`/compile/test run
(no network access in this session — see `docs/SECURITY.md`), Slither or
dependency-audit output, any testnet or mainnet deployment, any contract
verification on Celoscan, and any independent security audit. These are the
concrete next steps, in the order given in `docs/DEPLOYMENT.md`.
