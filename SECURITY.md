# Security

## Honest status

| Item                                                         | Status                                              |
| ------------------------------------------------------------ | --------------------------------------------------- |
| Contracts written to professional Solidity practice          | Implemented                                         |
| Test suite covering the invariants in section 18 of the spec | Implemented                                         |
| `npx hardhat compile` actually run in this delivery          | **Executed successfully**                           |
| `npx hardhat test` / coverage actually run                   | **Executed successfully**                           |
| Randomized property test                                     | **Executed successfully**                           |
| Foundry fuzz test                                            | **Executed successfully**                           |
| Echidna property campaign                                    | **Executed successfully**                           |
| CI quality gates                                             | **Configured**                                      |
| Slither / static analysis actually run                       | **Not executed**                                    |
| Independent third-party audit                                | **Not performed. Not claimed.**                     |
| Testnet deployment                                           | **Deployed on Celo Sepolia; manifest recorded**     |
| Mainnet deployment                                           | **Not performed**                                   |
| Celo Sepolia source verification                             | **Verified on Blockscout; see deployment manifest** |

The code has been compiled and tested locally against the installed
`hardhat-toolbox` and `@openzeppelin/contracts@^5` dependencies. Run the
quality gate again after any dependency update:

```bash
npm install
npx hardhat clean
npx hardhat compile
npx hardhat test
npx hardhat coverage
npx eslint . --ext .ts
npx prettier --check .
```

If compilation fails, the most likely causes are (a) an OpenZeppelin v5 API
name that has since changed, or (b) a Hardhat toolbox version mismatch — both
fixable by pinning versions in `package.json` to what actually installs.
Report back and this can be corrected quickly rather than papered over.

## Security practices applied in the contracts

- **Reentrancy**: no contract holds an intermediate USDm balance mid-call;
  `CeloHTServicePayments.payForService` pulls funds directly to final
  recipients (agent, treasury) rather than holding-then-forwarding, and all
  state (`_payments[...]`, counters) is written before any external call
  (checks-effects-interactions).
- **SafeERC20**: every transfer uses `SafeERC20.safeTransferFrom`, so
  non-standard ERC-20s that don't return a bool don't silently "succeed".
- **Access control**: OpenZeppelin `AccessControl` with named, minimal roles
  per contract (see `ARCHITECTURE.md`); no role is granted more
  authority than its function needs.
- **Zero-address checks**: every constructor and every treasury/admin setter
  rejects the zero address with a custom error.
- **Duplicate/replay prevention**: `AgentRegistry` keyed by wallet;
  `Governance` keyed by `(proposalId, voter)`; sequential, non-reusable IDs
  for agents, payments, certificates, donations, proposals.
- **Exact accounting**: the 80/20 split computes `agentShare` then derives
  `treasuryShare = amount - agentShare` (not a second independent
  multiplication), which guarantees `agentShare + treasuryShare == amount`
  exactly, with no rounding dust lost or created. Verified by
  `test/InvariantSweep.test.ts` across a range of prices and bps values.
- **Custom errors** throughout instead of require-strings, for gas and
  precision (see each interface's `error` declarations).
- **Malicious-token awareness**: `contracts/mocks/MockMaliciousTokens.sol`
  includes a fee-on-transfer mock specifically to test how the protocol
  behaves against non-standard tokens. Because the real `usdm` address is
  `immutable` and fixed at deployment, this class of attack is mitigated by
  construction as long as the deployed USDm address is the genuine, standard
  ERC-20 confirmed in `docs/ARCHITECTURE.md` — the mock exists to make that
  assumption explicit and testable, not because the contracts try to be
  fee-on-transfer-safe generically.
- **No unrestricted withdrawal function**: no contract has a `withdrawAll()`
  or equivalent. Funds only ever move to the configured treasury/agent
  addresses as part of a specific, validated action.

## Explicitly NOT done here (and why)

- **Fuzzing (Echidna/Foundry)**: Foundry fuzzes the split invariant for 10,000
  randomized amount/BPS cases through `test/foundry/SplitInvariant.t.sol`.
  Echidna independently runs the stateful property in
  `test/echidna/SplitInvariant.sol`. These campaigns cover the arithmetic
  invariant; they do not replace a full stateful protocol fuzz suite or an
  independent audit.
- **Slither**: not executed in this repository validation. Run it in CI or an
  audit environment before mainnet.
- **Dependency audit**: `npm audit --omit=dev --audit-level=high` reported no
  known production dependency vulnerabilities on 2026-09-05.
- **Independent audit**: out of scope for an AI coding session by
  definition; a real audit requires an independent human security firm.

## Mainnet blockers and accepted risks

- **HIGH operational risk: initial role custody is an EOA.** Each deployed
  contract initially grants `DEFAULT_ADMIN_ROLE` and specialized roles to the
  deployment admin. A compromised admin can change treasury destinations,
  fees, agent status, issuer authorization, or proposer authorization. This
  is not an unauthorized contract call; it is the intended privileged model,
  but it is unacceptable as sole mainnet custody. Transfer the roles to the
  approved multisig and verify the role events before mainnet. No new address
  is invented here.
- **MEDIUM token-assumption risk: USDm is immutable.** This prevents token
  substitution after deployment and is a deliberate integrity control, but a
  wrong or upgraded token at deployment cannot be repaired without a new
  deployment. The manifest and readiness check must validate the chain, code,
  symbol, and decimals before any future deployment.
- **LOW recoverability risk: there is no arbitrary token recovery function.**
  Tokens sent directly to a contract outside a protocol flow cannot be
  recovered. This avoids an unrestricted withdrawal backdoor and is accepted
  by the current architecture; operators must use the documented payment
  paths.

No CRITICAL or HIGH code-level exploit was identified in the reviewed
contracts. The EOA custody item remains a HIGH mainnet operational blocker.

## Threat model

See [THREAT_MODEL.md](THREAT_MODEL.md).
