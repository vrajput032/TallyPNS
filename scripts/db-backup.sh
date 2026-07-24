#!/usr/bin/env bash
# Backup Supabase/Postgres to backups/ using DIRECT_URL (not the pooler).
set -euo pipefail

export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:${PATH}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env"
OUT_DIR="${ROOT}/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${OUT_DIR}/tallypns-${STAMP}.dump"
LATEST_LINK="${OUT_DIR}/tallypns-latest.dump"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install with:"
  echo "  brew install libpq && brew link --force libpq"
  echo "  echo 'export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\"' >> ~/.zshrc"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

DB_URL="$(
  cd "${ROOT}/backend" && node --input-type=module -e "
    import 'dotenv/config';
    const url = process.env.DIRECT_URL || '';
    process.stdout.write(url);
  "
)"

if [[ -z "${DB_URL}" ]]; then
  echo "DIRECT_URL must be set in backend/.env (session/direct Postgres URL on port 5432)."
  exit 1
fi

if [[ "${DB_URL}" == *":6543"* ]] || [[ "${DB_URL}" == *"pgbouncer=true"* ]]; then
  echo "Refusing to dump via pooler URL. DIRECT_URL must use port 5432 (direct/session)."
  exit 1
fi

mkdir -p "${OUT_DIR}"
echo "Creating backup → ${OUT_FILE}"
pg_dump --dbname="${DB_URL}" --format=custom --no-owner --no-acl --file="${OUT_FILE}"
ln -sfn "$(basename "${OUT_FILE}")" "${LATEST_LINK}"
ls -lh "${OUT_FILE}"
echo "Also linked as ${LATEST_LINK}"
echo "Done. Copy this file to Drive/iCloud/USB for off-machine safety."
