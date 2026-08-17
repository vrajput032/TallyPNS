#!/usr/bin/env bash
# Deploy frontend (Cloudflare Pages) and/or backend (Render).
#
# Policy: prefer ONE deploy per batch of work to save Render pipeline minutes.
#   npm run deploy        # both (default)
#
# Usage:
#   npm run deploy              # both
#   npm run deploy:frontend     # frontend only (rare)
#   npm run deploy:backend      # backend only (rare)
#   bash scripts/deploy.sh all|frontend|backend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

TARGET="${1:-all}"
API_URL="https://tallypns-api.onrender.com/api"
PAGES_PROJECT="tallypns"

load_hook() {
  if [[ -n "${RENDER_DEPLOY_HOOK_URL:-}" ]]; then
    return 0
  fi
  if [[ -f "${ROOT}/backend/.env" ]]; then
    RENDER_DEPLOY_HOOK_URL="$(
      cd "${ROOT}/backend" && node --input-type=module -e "
        import 'dotenv/config';
        process.stdout.write(process.env.RENDER_DEPLOY_HOOK_URL || '');
      "
    )"
  fi
}

require_clean_or_confirm() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Warning: you have uncommitted local changes."
    echo "Backend deploys from GitHub, so uncommitted code will NOT go live."
  fi
}

ensure_pushed() {
  git fetch origin main --quiet 2>/dev/null || true
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "${branch}" != "main" ]]; then
    echo "Warning: current branch is '${branch}' (Render tracks main)."
  fi

  local local_sha remote_sha
  local_sha="$(git rev-parse HEAD)"
  remote_sha="$(git rev-parse origin/main 2>/dev/null || true)"

  if [[ -n "${remote_sha}" && "${local_sha}" != "${remote_sha}" ]]; then
    echo "Local HEAD (${local_sha:0:7}) differs from origin/main (${remote_sha:0:7})."
    echo "Pushing main to GitHub so Render can build the latest commit..."
    git push origin HEAD:main
  else
    echo "GitHub origin/main is up to date (${local_sha:0:7})."
  fi
}

deploy_frontend() {
  echo
  echo "==> Deploying frontend to Cloudflare Pages (${PAGES_PROJECT})..."
  VITE_API_URL="${API_URL}" VITE_ENABLE_3D=true npm run build -w frontend
  npx wrangler pages deploy frontend/dist --project-name="${PAGES_PROJECT}" --commit-dirty=true
  echo "Frontend deployed: https://tallypns.pages.dev"
}

deploy_backend() {
  echo
  echo "==> Deploying backend to Render..."
  load_hook
  if [[ -z "${RENDER_DEPLOY_HOOK_URL:-}" ]]; then
    echo "Missing RENDER_DEPLOY_HOOK_URL."
    echo "Add it to backend/.env from Render → tallypns-api → Settings → Deploy Hook."
    exit 1
  fi

  ensure_pushed
  local sha
  sha="$(git rev-parse HEAD)"
  local url="${RENDER_DEPLOY_HOOK_URL}"
  if [[ "${url}" != *"ref="* ]]; then
    if [[ "${url}" == *"?"* ]]; then
      url="${url}&ref=${sha}"
    else
      url="${url}?ref=${sha}"
    fi
  fi

  echo "Triggering Render deploy for commit ${sha:0:7}..."
  local response http_code
  response="$(curl -sS -w "\n%{http_code}" -X POST "${url}")"
  http_code="$(echo "${response}" | tail -n1)"
  body="$(echo "${response}" | sed '$d')"
  echo "Render response (${http_code}): ${body}"
  if [[ "${http_code}" != 200 && "${http_code}" != 201 && "${http_code}" != 202 ]]; then
    echo "Backend deploy trigger failed."
    exit 1
  fi
  echo "Backend deploy started: https://dashboard.render.com/web/srv-d9herf6q1p3s739q1280"
  echo "Live API: https://tallypns-api.onrender.com"
}

require_clean_or_confirm

case "${TARGET}" in
  frontend)
    deploy_frontend
    ;;
  backend)
    deploy_backend
    ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo "Usage: $0 [all|frontend|backend]"
    exit 1
    ;;
esac

echo
echo "Done."
