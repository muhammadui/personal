#!/usr/bin/env bash
# First production deploy (run from the repo root: bash apps/api/scripts/first-deploy.sh).
# Needs: `npx wrangler login` done, a workers.dev subdomain on the account (open
# dash.cloudflare.com -> Workers & Pages once), and apps/api/.prod.worker-secrets.json
# (generated during setup; never committed).
set -euo pipefail
cd "$(dirname "$0")/../../.."
pnpm --filter app build
cd apps/api
npx wrangler deploy
npx wrangler secret bulk .prod.worker-secrets.json
npx wrangler deploy
echo "Deployed. Open https://notes.muhammadbniu.com"
