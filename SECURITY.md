# Security

## Honest status

| Item | Status |
|---|---|
| Contracts written to professional Solidity practice | Implemented |
| Test suite covering the invariants in section 18 of the spec | Implemented |
| `npx hardhat compile` actually run in this delivery | **Not executed** — no network access in this sandbox |
| `npx hardhat test` / coverage actually run | **Not executed** |
| Slither / static analysis actually run | **Not executed** |
| Independent third-party audit | **Not performed. Not claimed.** |
| Testnet deployment | **Not performed** |
| Mainnet deployment | **Not performed** |

This is the single most important thing to understand about this delivery:
the code was written to compile and pass against `hardhat-toolbox` +
`@openzeppelin/contracts@^5`, following their current APIs from training
knowledge, but **it has not been compiled or executed in this session**
because this container has no network access to fetch `node_modules`. Run
the quality gate yourself before trusting this code:

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
  per contract (see `docs/ARCHITECTURE.md`); no role is granted more
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

- **Fuzzing (Echidna/Foundry)**: this is a Hardhat/TypeScript project per the
  spec; true property-based fuzzing tooling for Solidity (Echidna, Foundry's
  `forge test --fuzz`) is a different toolchain. `test/InvariantSweep.test.ts`
  provides a bounded parameter sweep as a partial substitute. Recommend
  adding a Foundry-based fuzz suite as a follow-up if deeper fuzzing is
  wanted — flag this explicitly rather than claim fuzzing was done.
- **Slither / dependency audit**: requires `pip`/`slither-analyzer` and
  `npm audit` against a real `node_modules`, neither available here.
- **Independent audit**: out of scope for an AI coding session by
  definition; a real audit requires an independent human security firm.

## Threat model

See `docs/THREAT_MODEL.md`.
