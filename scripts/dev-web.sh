#!/usr/bin/env bash
set +H
set -a
# shellcheck disable=SC1091
source /workspace/.env
set +a
cd /workspace
exec pnpm --filter @socializer/web dev
