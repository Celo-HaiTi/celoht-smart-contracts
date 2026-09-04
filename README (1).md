# CeloHT Smart Contracts

This repository targets Celo Sepolia only (`11142220`). See
[DEPLOYMENT.md](DEPLOYMENT.md) for the secure deployment procedure.

```sh
npm ci
npm run compile
npm test
npm run check:deployment
npm run deploy:sepolia
```

Deployment is manual. Store `SEPOLIA_RPC_URL` and `PRIVATE_KEY` only as secure
GitHub Actions secrets.
