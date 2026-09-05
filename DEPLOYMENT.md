# Celo Sepolia Deployment

CeloHT targets Celo Sepolia only.

- Chain ID: `11142220`
- Native currency: `CELO`
- Official RPC: `https://forno.celo-sepolia.celo-testnet.org`
- Explorer: https://celo-sepolia.blockscout.com
- RPC secret: `SEPOLIA_RPC_URL`
- Deployer secret: `PRIVATE_KEY`

## Required GitHub Secrets

Configure these secrets before manually dispatching
`.github/workflows/deploy-celo-sepolia.yml`:

- `SEPOLIA_RPC_URL`
- `PRIVATE_KEY`
- `USDM_ADDRESS_CELO_SEPOLIA`
- `GENERAL_TREASURY`
- `EDUCATION_TREASURY`
- `REFORESTATION_TREASURY`
- `GOVERNANCE_TREASURY`

The RPC URL and private key are never committed or printed. The workflow first
compiles the contracts and runs `check:deployment`. That check confirms RPC
connectivity, chain ID, deployer address detection, deployer CELO balance,
treasury addresses, and USDm contract metadata. A balance below `0.01 CELO`
stops the workflow before deployment.

## Safe Local Checks

With secrets supplied through a secure environment, run:

```sh
npm ci
npm run compile
npm test
npm run check:deployment
npm run check:wallet
```

The actual deployment command is manual and explicit:

```sh
npm run deploy:sepolia
```

It refuses every network except `celoSepolia` and refuses any chain other than
`11142220`. It writes `deployments/celoSepolia.json` only after successful
transactions and confirmation, and refuses to overwrite an existing manifest.
Review an existing deployment before starting a fresh deployment.

## Verification

After a confirmed deployment, source verification can be run manually with:

```sh
npm run verify:sepolia
```

Verification is configured for the Celo Sepolia Blockscout explorer. Review the
manifest and explorer results manually before integrating contract addresses.

## Manual Steps Before Deployment

1. Create the GitHub environment `celo-sepolia` and add the required secrets.
2. Verify the USDm and treasury addresses on Celo Sepolia.
3. Fund the deployer address with at least `0.01 CELO` on Celo Sepolia.
4. Review the compile, test, and readiness outputs.
5. Manually dispatch the deployment workflow.
