# Agent validation

Validation uses the official ERC-8004 Validation Registry. A request records
the named validator, agent ID, URI, and `bytes32` request hash. It does not
automatically execute or endorse the agent.

The Sepolia Validation proxy and implementation source are explorer-verified,
and the implementation source matches the pinned upstream commit. The
read-only registry preflight has passed. No live validation request or
response transaction is recorded yet.

## Request and response

1. The ERC-8004 agent owner or approved operator calls
   `validationRequest(validatorAddress, agentId, requestURI, requestHash)`.
   Publish the full input/output and validation instructions at `requestURI`.
   Compute `requestHash` as `keccak256` of the exact evidence payload bytes.
   The deployed registry requires a unique request hash; include a nonce or
   other unique request context when deriving it.
2. The designated validator independently reviews or re-executes the work,
   publishes its evidence, and calls
   `validationResponse(requestHash, response, responseURI, responseHash, tag)`.
   Only the requested validator can submit. `response` is in `[0,100]`.
3. Read `getValidationStatus(requestHash)` for the latest response fields and
   timestamp. Read `getSummary(agentId, validatorAddresses, tag)` for the
   count and average of answered requests. `getAgentValidations()` and
   `getValidatorRequests()` enumerate request hashes.

The deployed implementation permits the requested validator to update a
response more than once. Preserve all `ValidationResponse` events; a
transaction-level history is needed to show earlier judgments. The status
getter does not return the implementation's internal `hasResponse` flag, so
an initial `response == 0` is ambiguous with a submitted zero score. Use the
`ValidationResponse` event history (or summary membership) to distinguish
pending from answered requests.

## Independent validators and evidence

The requester selects the validator; the registry does not establish
independence, credentials, economic security, or correctness. Applications
should disclose validator identity, conflict policy, methodology, evidence
hashes, and any update history. The standard does not provide validator
staking, slashing, or incentives. Do not present a request as a successful
validation before a real `ValidationResponse` event is indexed and confirmed.

Validation requests/responses are signed directly by the owner/operator and
validator wallets. A backend may prepare payloads and index events, but it
must not hold signing keys or write success-shaped database records.
Backend/indexer/Supabase/UI code is outside this repository.

## Indexing

Index `ValidationRequest` and `ValidationResponse` by chain, registry,
request hash, agent, and validator. Store evidence URI/hash and event
provenance (block, transaction, log index). On reorg, roll back and replay
from the last finalized checkpoint. Resolve links from the chain-specific
explorer configuration rather than constructing them from untrusted input.
