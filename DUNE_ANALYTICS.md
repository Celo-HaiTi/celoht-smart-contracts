# Dune Analytics — Event Reference

All events below are indexed on their key fields (`indexed` in the ABI) to
make Dune queries efficient. This document lists every event a Dune
dashboard would need to reconstruct each protocol area described in the
spec (section 24).

## Agent Network — `CeloHTAgentRegistry`

- `AgentRegistered(agentId indexed, wallet indexed, timestamp)` → registrations, registration revenue (fixed fee × count)
- `AgentStatusUpdated(agentId indexed, active)` → active vs inactive agent counts over time
- `AgentVerificationUpdated(agentId indexed, verified)`
- `RegistrationFeeUpdated`, `TreasuryUpdated` — config history

## Services — `CeloHTServicePayments`

- `ServicePaid(paymentId indexed, customer indexed, agentId indexed, serviceType, amount, timestamp)` → P2P/Education/Reforestation payment volume by type
- `PaymentDistributed(paymentId indexed, agentShare, treasuryShare)` → agent revenue vs treasury revenue, joinable to `ServicePaid` on `paymentId`

## Education — `CeloHTEducation`

- `CertificateFeePaid(payer indexed, recipient indexed, amount, timestamp)` → certificate payments
- `CertificateIssued(certificateId indexed, recipient indexed, issuer indexed, metadataURI)` → certificates issued
- `CertificateRevoked(certificateId indexed, revokedBy indexed, reason)` → certificates revoked
- `IssuerAuthorizationChanged` — issuer set over time

## Reforestation — `CeloHTReforestation`

- `DonationReceived(donationId indexed, donor indexed, amount, timestamp)` → total USDm donated (`SUM(amount)`), donor count (`COUNT(DISTINCT donor)`), donation count (`COUNT(*)`)

## Governance — `CeloHTGovernance`

- `ProposalCreated(proposalId indexed, proposer indexed, contentHash, metadataURI, startTime, endTime)` → proposal list
- `VoteCast(proposalId indexed, voter indexed, option)` → voters, YES/NO/ABSTAIN breakdown per proposal, participation rate (`COUNT(DISTINCT voter) / eligible wallets`, where "eligible" is off-chain-defined since there is no token-gated eligibility list)
- `ProposalFinalized(proposalId indexed, yesVotes, noVotes, abstainVotes)` → final tallies without re-aggregating raw votes
- Participation fees: `SUM` of the fixed fee × `COUNT` of `VoteCast` events (fee itself is not emitted per-vote since it is a protocol constant read from `participationFee` at call time — for historical accuracy, join against `ParticipationFeeUpdated` event history by block range)

## Suggested Dune tables

1. `celoht_agents` — from `AgentRegistered` + latest `AgentStatusUpdated` per agent
2. `celoht_service_payments` — `ServicePaid` joined to `PaymentDistributed`
3. `celoht_certificates` — `CertificateFeePaid`, `CertificateIssued`, `CertificateRevoked` joined by recipient/certificateId
4. `celoht_donations` — `DonationReceived`
5. `celoht_governance` — `ProposalCreated` joined to `VoteCast` and `ProposalFinalized`
