#!/usr/bin/env bash
# Local Slack Quick Bill dev helper — exposes backend via ngrok and prints setup steps.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env"
PORT="${PORT:-4000}"
NGROK_API="${NGROK_API:-http://127.0.0.1:4040}"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

if ! command -v ngrok >/dev/null 2>&1; then
  red "ngrok is not installed. Install: brew install ngrok"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  red "Missing ${ENV_FILE}. Copy from backend/.env.example first."
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}" 2>/dev/null || true

missing=()
[[ -z "${SLACK_BOT_TOKEN:-}" ]] && missing+=("SLACK_BOT_TOKEN")
[[ -z "${SLACK_SIGNING_SECRET:-}" ]] && missing+=("SLACK_SIGNING_SECRET")
[[ -z "${SLACK_ALLOWED_USER_IDS:-}" ]] && missing+=("SLACK_ALLOWED_USER_IDS")

if [[ ${#missing[@]} -gt 0 ]]; then
  yellow "Add these to backend/.env (then restart backend):"
  for key in "${missing[@]}"; do
    echo "  ${key}=..."
  done
  echo
  yellow "Slack app: https://api.slack.com/apps → Create New App"
  yellow "  Bot scopes: chat:write, commands, im:write"
  yellow "  Slash command /bill + Interactivity → same Request URL (printed below after ngrok starts)"
  echo
fi

if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
  red "Backend is not running on port ${PORT}."
  yellow "Run: npm run dev -w backend   (or npm run dev from repo root)"
  exit 1
fi

if ! curl -sf "${NGROK_API}/api/tunnels" >/dev/null 2>&1; then
  green "Starting ngrok tunnel to port ${PORT}..."
  ngrok http "${PORT}" --log=stdout >/tmp/telly-ngrok.log 2>&1 &
  sleep 2
fi

PUBLIC_URL=""
for _ in 1 2 3 4 5; do
  PUBLIC_URL="$(curl -sf "${NGROK_API}/api/tunnels" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      try {
        const j=JSON.parse(d);
        const t=(j.tunnels||[]).find(x=>x.public_url&&x.public_url.startsWith('https'));
        if(t) console.log(t.public_url);
      } catch {}
    });
  " 2>/dev/null || true)"
  [[ -n "${PUBLIC_URL}" ]] && break
  sleep 1
done

if [[ -z "${PUBLIC_URL}" ]]; then
  red "Could not read ngrok public URL. Open http://127.0.0.1:4040"
  exit 1
fi

SLACK_EVENTS_URL="${PUBLIC_URL}/api/slack/events"

green "Backend: http://127.0.0.1:${PORT}"
green "Public URL (for Slack): ${PUBLIC_URL}"
echo
green "Paste this Request URL in your Slack app:"
echo "  ${SLACK_EVENTS_URL}"
echo
yellow "Slack app checklist:"
echo "  1. Slash Commands → /bill → Request URL above"
echo "  2. Interactivity → ON → same Request URL"
echo "  3. OAuth → Bot Token Scopes: chat:write, commands, im:write"
echo "  4. Install app to workspace"
echo "  5. Copy Bot Token + Signing Secret → backend/.env"
echo "  6. Copy your Slack member ID → SLACK_ALLOWED_USER_IDS"
echo "  7. Restart backend (tsx watch may auto-reload after .env change)"
echo
yellow "Test in Slack: /bill"
