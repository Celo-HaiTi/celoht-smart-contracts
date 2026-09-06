# Production Readiness

## IMPLEMENTED

- Solidity contracts for agent registration, service payments, education
  certificates, reforestation donations, and advisory governance.
- Celo Sepolia-only deployment guardrails with centralized address validation.
- Deployment hardening that separates the transaction sender from the protocol
  administrator through `PROTOCOL_ADMIN`.
- Role-gated treasury, fee, registry, issuer, and governance configuration
  changes.
- Exact USDm transfer checks and payment-split accounting in the contract flows.

## TESTNET READY

- The recorded Celo Sepolia manifest contains deployment transactions, contract
  addresses, and Blockscout verification metadata.
- Local compilation and the Hardhat test suite pass for the current source tree.

## PRODUCTION READY

- None. No Mainnet deployment is configured or claimed.

## PLANNED

- Independent third-party security audit and public remediation record.
- Production operational runbook, monitoring, incident response, and recovery
  ownership.
- Verified Safe or governance authority configured as `PROTOCOL_ADMIN` for any
  future operational deployment.

## BLOCKED

- Mainnet readiness is blocked by the missing independent audit, operational
  sign-off, and production governance evidence.
- Any fresh live deployment is blocked until the USDm address, treasury
  authority, and `PROTOCOL_ADMIN` are independently verified.
- The recorded Celo Sepolia deployment currently retains default admin roles on
  its deployment EOA. A reviewed role handoff is required before treating that
  deployment as operationally governed.

## MOCK / DEMO

- `MockUSDm.sol` and `MockMaliciousTokens.sol` are test-only fixtures and are
  not production assets.

## HISTORICAL / DEPRECATED

- No Alfajores or cUSD deployment path is current for this repository.

## Evidence and Test Snapshot

- `npm run compile`: passed.
- `npm test`: 106 tests passed after the deployment-admin hardening.
- `npm run coverage`: passed, with 78.61% statements and 77.59% lines for
  contracts; this is below the 95% target and remains a quality gap.
- `npm run lint`: passed with an upstream TypeScript support warning from
  `@typescript-eslint`.
- `npm run format:check`: passed.
- `npx tsc --noEmit`: passed.
- `npm audit --omit=dev --audit-level=high`: 0 production vulnerabilities
  reported.
- Foundry is not installed in the audit environment; Echidna, live RPC
  verification, and independent audit evidence were not established in this
  audit.
