#!/bin/sh
# Execute only on the separately approved acquisition host. Never on the website host.
set -eu
cd "$(dirname "$0")/.."
: "${AKQUISE_DEPLOY_CONFIRMED:?Set AKQUISE_DEPLOY_CONFIRMED=yes after reviewing the dedicated target}"
[ "$AKQUISE_DEPLOY_CONFIRMED" = yes ] || exit 1
compose() { docker compose --env-file deploy/production.env -f compose.production.yaml "$@"; }
compose config --quiet
compose build app migrate
compose up -d --wait db
# Run backup.sh first for an existing populated deployment; no reset or seed is ever run.
compose run --rm migrate
compose up -d --no-deps --wait --wait-timeout 120 app
compose up -d --no-deps gateway
