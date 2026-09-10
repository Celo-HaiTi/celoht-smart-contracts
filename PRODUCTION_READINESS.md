# CeloHT Production Readiness

## Repository

- Name: `celoht-smart-contracts`
- Purpose: CeloHT smart-contract layer for agent registration, service payments, education support, reforestation donations, and advisory governance on Celo.

## Repository Type

Smart Contracts

## Status

READY FOR TESTING

## What Works

- `npm run compile` succeeds.
- `npm test` passes with `108 passing`.
- `npm run coverage` succeeds and produces coverage output for the Solidity contracts.
- `npm run lint` runs successfully (with a TypeScript-eslint version warning only).
- `npx tsc --noEmit` succeeds.
- `npm audit --omit=dev --audit-level=high` reports no production vulnerabilities.
- A Celo Sepolia deployment manifest exists in `deployments/celoSepolia.json` and includes verification metadata from Blockscout.
- Deployment guardrails and secret validation are in place through `deployConfig.ts` and GitHub Actions workflows.

## What Was Changed

- Created `AUDIT.md` to document repository role, architecture, current status, blockers, and security findings.
- Replaced the stale `PRODUCTION_READINESS.md` content with a verified, evidence-based readiness summary for this repository.
- Preserved the existing CeloHT terminology and USDm references as the correct stablecoin reference.

## Tests

- `npm run compile` — passed
- `npm test` — passed (`108 passing`)
- `npm run coverage` — passed (`78.61%` statements, `54.71%` branches, `77.59%` lines)
- `npm run lint` — passed (with TypeScript-eslint version warning)
- `npx tsc --noEmit` — passed
- `npm audit --omit=dev --audit-level=high` — passed, `0` production vulnerabilities
- `npx hardhat run checkDeploymentReady.ts --network celoSepolia` — failed due to missing `SEPOLIA_RPC_URL` in this workspace environment

## Security

- Contract-level security checks performed via code review, contract tests, and invariant coverage.
- Deployment secrets are not committed and are required only through GitHub Actions environment configuration.
- Address validation for deployment config is enforced via `deployConfig.ts`.
- No production vulnerabilities were reported by `npm audit` for production dependencies.
- No independent third-party audit evidence is present for this repository or the recorded Celo Sepolia deployment.

## Deployment

- Deployment target configured: Celo Sepolia only.
- Deployment workflow exists in `.github/workflows/deploy-celo-sepolia.yml`.
- Verified existing deployment manifest: `deployments/celoSepolia.json`.
- Live deployment is blocked in this workspace until the environment secrets and governance configuration are present and independently verified.

## External Dependencies

- Real Celo Sepolia USDm address must be independently verified before any live deployment.
- Treasury addresses must be independently confirmed and supplied through environment secrets.
- `PROTOCOL_ADMIN` must be a reviewed Safe or governance authority, not the deployer EOA.
- Deployment requires a valid `SEPOLIA_RPC_URL` and `PRIVATE_KEY`.

## P0

- Missing deployment secrets in this workspace prevent a fresh live deployment preflight from succeeding.
- The current deployment manifest does not yet evidence a reviewed operational governance handoff away from the deployer EOA.
- No independent third-party security audit has been completed for the contracts or deployment.

## P1

- Contract coverage remains below a higher-assurance production target (`78.61%` statements, `54.71%` branches).
- The recorded deployment currently shows `deployer` and `protocolAdmin` as the same address, which should be re-evaluated before operational claims.
- The repository is validated for testing, but not yet ready to claim live production operations.

## P2

- Expand test coverage on remaining contract failure paths and configuration edge cases.
- Add a formal runbook and monitoring plan for any future live deployment.
- Clarify the distinction between verified local test status and verified live deployment status in the documentation.

## Remaining Blockers

### WHAT IS MISSING

- A complete production environment for Celo Sepolia, including `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `PROTOCOL_ADMIN`, treasury addresses, and `USDM_ADDRESS_CELO_SEPOLIA`.
- Independent evidence of a reviewed governance/Safe handoff for the deployment admin authority.
- Independent security audit evidence and remediation record.

### WHY IT MATTERS

- Without these items, live deployment, on-chain verification, and operational governance cannot be responsibly claimed.

### WHAT IS REQUIRED

- Populate environment secrets in GitHub Actions or equivalent secure infrastructure.
- Verify all on-chain addresses and governance authority through a controlled review process.
- Complete a third-party review and publish a remediation record if needed.

## Evidence

- `deployments/celoSepolia.json`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-celo-sepolia.yml`
- `deployConfig.ts`
- `checkDeploymentReady.ts`
- `package.json`
- Local command outputs from `npm run compile`, `npm test`, `npm run coverage`, `npx tsc --noEmit`, `npm audit --omit=dev --audit-level=high`, and `npx hardhat run checkDeploymentReady.ts --network celoSepolia`.
