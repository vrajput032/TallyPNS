#!/usr/bin/env bash
# Dump Postgres, copy into the private DBDumps repo, commit, and push.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP_REPO="${DUMP_REPO:-$(cd "${ROOT}/.." && pwd)/DBDumps}"
REMOTE_URL="git@github.com:vrajput032/DBDumps.git"

bash "${ROOT}/scripts/db-backup.sh"

LATEST="${ROOT}/backups/tallypns-latest.dump"
if [[ ! -L "${LATEST}" && ! -f "${LATEST}" ]]; then
  echo "Missing ${LATEST}"
  exit 1
fi

TARGET_NAME="$(basename "$(readlink "${LATEST}" || true)")"
if [[ -z "${TARGET_NAME}" ]]; then
  TARGET_NAME="$(basename "${LATEST}")"
fi
SOURCE="${ROOT}/backups/${TARGET_NAME}"
if [[ ! -f "${SOURCE}" ]]; then
  SOURCE="${LATEST}"
fi

if [[ ! -d "${DUMP_REPO}/.git" ]]; then
  echo "Private dump repo not found at ${DUMP_REPO}"
  echo "Clone it once:"
  echo "  git clone ${REMOTE_URL} ${DUMP_REPO}"
  exit 1
fi

cp -p "${SOURCE}" "${DUMP_REPO}/${TARGET_NAME}"
ln -sfn "${TARGET_NAME}" "${DUMP_REPO}/tallypns-latest.dump"

cd "${DUMP_REPO}"
git add "${TARGET_NAME}" tallypns-latest.dump
if git diff --cached --quiet; then
  echo "No new dump to push (already on GitHub)."
  exit 0
fi

STAMP="${TARGET_NAME#tallypns-}"
STAMP="${STAMP%.dump}"
git commit -m "Backup ${STAMP}"
git push
echo "Pushed to ${REMOTE_URL}"
