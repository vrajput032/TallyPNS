#!/usr/bin/env bash
# After a backup, compare row counts with the previous snapshot. Fails on unexpected drops.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/backups"
CURRENT="${OUT_DIR}/row-counts-latest.json"
PREVIOUS="${OUT_DIR}/row-counts-previous.json"

mkdir -p "${OUT_DIR}"

bash "${ROOT}/scripts/db-row-counts.sh" --save >/dev/null

if [[ ! -f "${PREVIOUS}" ]]; then
  cp "${CURRENT}" "${PREVIOUS}"
  echo "First row-count snapshot saved (no previous baseline yet)."
  exit 0
fi

node <<NODE
const fs = require("fs");
const prev = JSON.parse(fs.readFileSync("${PREVIOUS}", "utf8"));
const cur = JSON.parse(fs.readFileSync("${CURRENT}", "utf8"));
const keys = [...new Set([...Object.keys(prev), ...Object.keys(cur)])].filter(
  (k) => k !== "capturedAt"
);
const drops = [];
for (const k of keys) {
  const a = Number(prev[k]);
  const b = Number(cur[k]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
  if (b < a) drops.push({ table: k, was: a, now: b });
}
if (drops.length) {
  console.error("Row counts dropped since last backup snapshot:");
  for (const d of drops) console.error("  " + d.table + ": " + d.was + " -> " + d.now);
  process.exit(1);
}
console.log("Row counts OK (no drops vs previous snapshot).");
NODE

cp "${CURRENT}" "${PREVIOUS}"
