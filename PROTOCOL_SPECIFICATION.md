# Protocol Specification

## Token policy
CeloHT issues **no token**. No ERC-20, no governance token, no reward token,
no staking token. All protocol payments settle in **USDm**. CELO is used
exclusively for network gas and is never a valid payment asset in these
contracts.

## Fee schedule (initial configuration)

| Action | Fee (USDm) | Split |
|---|---|---|
| Agent registration | 0.20 | 100% → treasury |
| P2P assistance | 0.010 | 80% agent / 20% treasury |
| Education assistance (agent-mediated) | 0.020 | 80% agent / 20% treasury |
| Certificate issuance fee | 0.010 | 100% → education treasury |
| Governance vote (participation fee) | 0.010 | 100% → governance treasury |
| Reforestation assistance | 0 (free) | n/a |
| Reforestation donation | voluntary | 100% → reforestation treasury |

All fees are configurable post-deployment by the relevant `FEE_ADMIN_ROLE` /
`GOVERNANCE_ADMIN_ROLE` holder, with every change emitting an event.

## Revenue split invariant

For every paid P2P or Education-assistance transaction of amount `A`:

```
agentShare = floor(A * agentShareBps / 10000)
treasuryShare = A - agentShare
agentShare + treasuryShare == A   // always, by construction
```

`agentShareBps` defaults to `8000` (80.00%) and is configurable within
`[0, 10000]`.

## Governance model

- Voting power: exactly 1 per wallet per proposal. Not derived from any
  token or CELO balance.
- Participation fee: fixed 0.010 USDm, paid once per vote cast. Does not
  scale voting power under any configuration — the tally logic has no path
  that reads the paid amount.
- Vote options: YES / NO / ABSTAIN.
- Result status: **advisory**. See `docs/ARCHITECTURE.md` → Governance
  Security for why this contract does not, and should not without further
  explicit design, control the treasury directly.

## Roadmap alignment

This repository implements Phase-appropriate infrastructure for CeloHT's
four-phase 2026–2028+ roadmap. Reforestation remains a design/pilot-phase
pillar at the protocol level; `CeloHTReforestation.sol` intentionally avoids
hard-coding any planting claim or environmental-token mechanic that would
outrun the actual operational methodology.
