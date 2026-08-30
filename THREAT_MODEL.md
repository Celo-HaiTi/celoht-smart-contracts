# Threat Model

## Assets protected
1. USDm held momentarily in-flight during a service payment, donation, or fee.
2. Correctness of the 80/20 agent/treasury split.
3. Integrity of the agent registry (who is a legitimate, active agent).
4. Integrity of the certificate record (who legitimately holds a credential).
5. Integrity of governance vote counts (1 wallet = 1 vote, no double voting).
6. Availability of the protocol (no single actor can brick core flows).

## Actors
- **Customer** — pays for a service, donates, votes, pays a certificate fee.
- **Agent** — registered wallet providing P2P/Education assistance.
- **Issuer** (`EDUCATION_ISSUER_ROLE`) — issues/revokes certificates.
- **Admin roles** — `AGENT_ADMIN_ROLE`, `TREASURY_ADMIN_ROLE`, `FEE_ADMIN_ROLE`,
  `GOVERNANCE_ADMIN_ROLE`, `PROPOSER_ROLE`, `DEFAULT_ADMIN_ROLE`.
- **Attacker** — any address, potentially deploying a malicious ERC-20 or
  attempting reentrancy, replay, or unauthorized configuration changes.

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| Attacker pays with a fake/malicious "USDm" token | `usdm` is `immutable`, set once at deploy; no function accepts a token parameter for payment |
| Attacker registers as agent twice to double-dip | `_agentIdByWallet[msg.sender] != 0` check reverts with `AlreadyRegistered` |
| Inactive/removed agent still collects paid-service revenue | `payForService` checks `agentRegistry.isAgentActive(agentId)` before any transfer |
| Rounding manipulation of the 80/20 split | `treasuryShare = amount - agentShare` guarantees exact conservation; swept in `InvariantSweep.test.ts` |
| Certificate issued without payment | `issueCertificate` requires `eligiblePaymentsRemaining[recipient] > 0`, decremented atomically |
| Double voting | `_hasVoted[proposalId][voter]` set before any external call, checked on entry |
| Voting fee used to buy extra vote weight | Contract has exactly one `yesVotes += 1` / `noVotes += 1` / `abstainVotes += 1` path per vote call; fee amount does not enter the tally logic at all |
| Voting outside the window | `block.timestamp` checked against `startTime`/`endTime` before any state change |
| Reentrancy during a service payment (malicious agent wallet with a fallback) | State (`_payments[...]`, counters) written before external calls; SafeERC20 transfers are the last external interactions in the function; no callback is invoked by this contract after the transfer |
| Zero-address treasury / admin bricking payouts | Every constructor and setter rejects `address(0)` |
| Single compromised key drains treasury via a contract function | No contract exposes a withdrawal function of any kind; funds only move to the configured treasury/agent address as a side effect of a specific validated action, never on admin demand |
| Governance vote silently granted binding treasury authority | By design, `CeloHTGovernance` has zero references to any treasury-holding contract's privileged functions; execution is explicitly out of scope (see `docs/ARCHITECTURE.md`, Governance Security) |
| Unauthorized role escalation | All privileged setters use OpenZeppelin `onlyRole`; role grants themselves require `DEFAULT_ADMIN_ROLE` |

## Out of scope for these contracts
- Off-chain identity verification (KYC) correctness — delegated entirely to
  an external process; this contract only stores the resulting boolean flag.
- Frontend input validation — the contracts assume a potentially adversarial
  caller regardless of frontend behavior, per section 25 of the spec
  ("the DApp must never be responsible for enforcing financial rules").
- Governance execution/binding authority — explicitly not implemented.
- Bridge/cross-chain risk — CeloHT does not bridge assets in this scope.

## Residual risk
- Centralization risk while `DEFAULT_ADMIN_ROLE` sits on a single deployer
  key rather than the Maintainer Council's Safe. This is expected to be
  resolved during deployment configuration, not contract design — see
  `docs/DEPLOYMENT.md`.
- Real-world Sybil resistance for "1 wallet = 1 vote" is bounded by the
  0.010 USDm fee and wallet-creation cost, not by anything on-chain; this is
  a known, common limitation of wallet-based one-person-one-vote systems and
  should be weighed by the Maintainer Council, not silently assumed solved.
