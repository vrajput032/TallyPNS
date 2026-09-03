#!/usr/bin/env bash
# Sync Slack env vars from backend/.env to Render (tallypns-api).
#
# Requires RENDER_API_KEY (Render Dashboard → Account Settings → API Keys).
# Add to backend/.env or export before running:
#   RENDER_API_KEY=rnd_...
#
# Usage:
#   npm run render:sync-slack-env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_ID="srv-d9herf6q1p3s739q1280"
ENV_FILE="${ROOT}/backend/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

load_env() {
  local key="$1"
  cd "${ROOT}/backend" && node --input-type=module -e "
    import 'dotenv/config';
    const v = process.env['${key}'];
    if (v) process.stdout.write(v);
  "
}

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  RENDER_API_KEY="$(load_env RENDER_API_KEY || true)"
fi

if [[ -z "${RENDER_API_KEY}" ]]; then
  echo "Missing RENDER_API_KEY."
  echo "Create one at https://dashboard.render.com/u/settings#api-keys"
  echo "Then add to backend/.env: RENDER_API_KEY=rnd_..."
  exit 1
fi

sync_var() {
  local key="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    echo "Skip ${key} (empty in backend/.env)"
    return 0
  fi
  local http_code
  http_code="$(
    curl -sS -o /dev/null -w "%{http_code}" -X PUT \
      "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/${key}" \
      -H "Authorization: Bearer ${RENDER_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$(node -e "process.stdout.write(JSON.stringify({ value: process.argv[1] }))" "${value}")"
  )"
  if [[ "${http_code}" != "200" && "${http_code}" != "201" ]]; then
    echo "Failed to set ${key} (HTTP ${http_code})"
    exit 1
  fi
  echo "Set ${key}"
}

SLACK_BOT_TOKEN="$(load_env SLACK_BOT_TOKEN)"
SLACK_SIGNING_SECRET="$(load_env SLACK_SIGNING_SECRET)"
SLACK_ALLOWED_USER_IDS="$(load_env SLACK_ALLOWED_USER_IDS)"
FRONTEND_URL="$(load_env FRONTEND_URL)"

echo "Syncing Slack env vars to Render service ${SERVICE_ID}..."
sync_var SLACK_BOT_TOKEN "${SLACK_BOT_TOKEN}"
sync_var SLACK_SIGNING_SECRET "${SLACK_SIGNING_SECRET}"
sync_var SLACK_ALLOWED_USER_IDS "${SLACK_ALLOWED_USER_IDS}"
sync_var FRONTEND_URL "${FRONTEND_URL:-https://tallypns.pages.dev}"

echo
echo "Env vars updated. Triggering redeploy..."
bash "${ROOT}/scripts/deploy.sh" backend
echo "Done. After deploy finishes, update Slack app URLs to:"
echo "  https://tallypns-api.onrender.com/api/slack/events"
