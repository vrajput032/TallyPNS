#!/usr/bin/env bash
# Restore a .dump into a Postgres database (local Docker or a new Supabase project).
#
# Local (default):
#   npm run db:restore -- backups/tallypns-latest.dump
#
# New Supabase / recovery target:
#   RESTORE_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres" \
#     npm run db:restore -- backups/tallypns-latest.dump
#
# Encrypted backups from DBDumps (*.dump.age) are decrypted with AGE_IDENTITY
# (default ~/.config/tallypns/age-backup.key):
#   npm run db:restore -- ../DBDumps/tallypns-latest.dump.age
set -euo pipefail

export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:${PATH}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP_FILE="${1:-${ROOT}/backups/tallypns-latest.dump}"
LOCAL_URL="postgresql://postgres:postgres@127.0.0.1:5433/tallypns"
TARGET_URL="${RESTORE_URL:-${LOCAL_URL}}"
AGE_IDENTITY="${AGE_IDENTITY:-${HOME}/.config/tallypns/age-backup.key}"

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "Dump not found: ${DUMP_FILE}"
  echo "Usage: $0 [path/to/backup.dump | path/to/backup.dump.age]"
  echo "Create one first with: npm run db:backup"
  exit 1
fi

if [[ "${DUMP_FILE}" == *.age ]]; then
  if ! command -v age >/dev/null 2>&1; then
    echo "age not found. Install with: brew install age"
    exit 1
  fi
  if [[ ! -f "${AGE_IDENTITY}" ]]; then
    echo "Private key not found at ${AGE_IDENTITY} (set AGE_IDENTITY to its path)."
    exit 1
  fi
  DECRYPTED="$(mktemp "${TMPDIR:-/tmp}/tallypns-restore.XXXXXX")"
  trap 'rm -f "${DECRYPTED}"' EXIT
  age --decrypt --identity "${AGE_IDENTITY}" --output "${DECRYPTED}" "${DUMP_FILE}"
  DUMP_FILE="${DECRYPTED}"
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore not found. Install with:"
  echo "  brew install libpq && brew link --force libpq"
  exit 1
fi

if [[ "${TARGET_URL}" == *":6543"* ]] || [[ "${TARGET_URL}" == *"pgbouncer=true"* ]]; then
  echo "Refusing to restore via pooler URL. Use a direct port-5432 connection string."
  exit 1
fi

if [[ -z "${RESTORE_URL:-}" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found (needed for local restore)."
    echo "Install Docker Desktop, or set RESTORE_URL to a remote Postgres URL."
    exit 1
  fi
  cd "${ROOT}"
  docker compose up -d db
  echo "Waiting for local Postgres on :5433 ..."
  for _ in $(seq 1 40); do
    if docker compose exec -T db pg_isready -U postgres -d tallypns >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

echo "Restoring ${DUMP_FILE}"
echo "Target: ${TARGET_URL%%@*}@****"
pg_restore --dbname="${TARGET_URL}" --clean --if-exists --no-owner --no-acl "${DUMP_FILE}"
echo "Restore finished."

if [[ -z "${RESTORE_URL:-}" ]]; then
  echo
  echo "Point backend/.env at the local DB:"
  echo "  DATABASE_URL=\"${LOCAL_URL}\""
  echo "  DIRECT_URL=\"${LOCAL_URL}\""
fi
