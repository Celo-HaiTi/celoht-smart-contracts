# Treasury

CeloHT settles protocol fees and donations in USDm. CELO is used only for gas
and network operations. The contracts do not mint, stake, withdraw, or custody a
native CeloHT token.

Treasury destinations are constructor-configured and can only be changed by the
appropriate role. Payments are sent directly to the configured treasury or
agent wallet, and exact-transfer checks reject fee-on-transfer settlement tokens.

The recorded Celo Sepolia deployment uses the treasury address in
`deployments/celoSepolia.json`. Mainnet treasury custody, multisig policy,
monitoring, incident response, and recovery procedures remain blockers for any
future Mainnet deployment.
