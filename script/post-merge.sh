#!/usr/bin/env bash
set -Eeuo pipefail

export CI=true

npm ci --no-audit --no-fund
npm run db:migrate:auth
npm run check
npm run build
