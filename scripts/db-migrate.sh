#!/usr/bin/env bash
# Apply Prisma migrations to the database in backend/.env — backup first, confirm on Supabase.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

DB_URL="$(
  cd "${ROOT}/backend" && node --input-type=module -e "
    import 'dotenv/config';
    process.stdout.write(process.env.DIRECT_URL || '');
  "
)"

if [[ -z "${DB_URL}" ]]; then
  echo "DIRECT_URL must be set in backend/.env"
  exit 1
fi

echo "==> Pre-migration backup..."
bash "${ROOT}/scripts/db-backup.sh"
bash "${ROOT}/scripts/db-backup-count-check.sh" || {
  echo "Row-count check failed before migrate. Fix or investigate before continuing."
  exit 1
}

if [[ "${DB_URL}" == *"supabase.com"* ]]; then
  echo
  echo "You are about to migrate the LIVE Supabase database."
  echo "A fresh backup is in backups/."
  printf "Type YES to continue: "
  read -r confirm
  if [[ "${confirm}" != "YES" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "==> prisma migrate deploy"
cd "${ROOT}/backend"
npx prisma migrate deploy
npx prisma generate

echo "==> Row counts after migrate"
bash "${ROOT}/scripts/db-row-counts.sh" --save

echo "Done."
