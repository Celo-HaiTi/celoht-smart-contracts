# Agent reputation

Reputation is written to and read from the official ERC-8004 Reputation
Registry. CeloHT service payment accounting remains in
[`CeloHTServicePayments`](contracts/CeloHTServicePayments.sol); it is not
replaced by reputation feedback.

The read-only registry and ABI checks have passed, and the local Sepolia-fork
suite exercises feedback, response, and revocation behavior against deployed
registry bytecode. No live feedback, revocation, or response transaction has
been performed by this repository environment.

## Feedback functions

- `giveFeedback(agentId, value, valueDecimals, tag1, tag2, endpoint,
feedbackURI, feedbackHash)` submits a signed fixed-point value and optional
  context. `valueDecimals` is between 0 and 18. Use a meaningful tag (for
  example `quality` or `successRate`) and keep any detailed review data in a
  content-addressed file or a URI with a `keccak256` hash.
- `readFeedback(agentId, clientAddress, feedbackIndex)` reads one
  client/agent feedback item.
- `readAllFeedback(agentId, clientAddresses, tag1, tag2, includeRevoked)`
  reads matching items. Empty filters are supported by the deployed
  implementation.
- `getSummary(agentId, clientAddresses, tag1, tag2)` aggregates matching
  non-revoked items. **A non-empty client address list is required** by the
  implementation to reduce unfiltered Sybil/spam aggregation.
- `revokeFeedback(agentId, feedbackIndex)` can only revoke the caller's own
  feedback. Feedback indices are 1-based per `(agentId, clientAddress)`.

The official registry rejects feedback from the agent owner and approved
operators. This is enforced on-chain; frontend checks are only for UX. Feedback
is permissionless and can still be Sybil-manipulated. A summary is not a
reputation guarantee.

## CeloHT payment context

`ServicePaid` and `PaymentDistributed` events from the CeloHT Service Payments
contract identify the CeloHT agent ID, customer, service type, amount, and
distribution. An application may attach a real transaction hash/proof in its
off-chain feedback payload. It must not infer successful payment from UI state
or mock records. ERC-8004 feedback does not escrow, refund, or settle USDm.

For feedback from an agent acting as a client, the standard recommends using
that agent's verified `agentWallet` as `clientAddress`. Feedback writes are
wallet-signed transactions to the official Reputation Registry; reads and
summaries are exposed by the interface/client in
[`erc8004Config.ts`](erc8004Config.ts).

## Indexing

Index `NewFeedback`, `FeedbackRevoked`, and `ResponseAppended`, keyed by
chain, Reputation Registry address, `agentId`, client address, and
`feedbackIndex`. Preserve block number, transaction hash, and log index for
reorg-safe history and explorer links. Reconstruct off-chain feedback detail
only after checking its URI/hash. Supabase and indexer code are not included
in this contracts repository.
