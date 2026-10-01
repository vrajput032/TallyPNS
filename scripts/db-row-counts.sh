#!/usr/bin/env bash
# Print row counts for core business tables (read-only).
set -euo pipefail

export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:${PATH}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env"
SAVE=false
if [[ "${1:-}" == "--save" ]]; then
  SAVE=true
fi

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

json="{"
first=1
for t in User Customer SalesInvoice PurchaseBill RawMaterialBill PaymentReceipt RawMaterialPayment VendorPayment; do
  count="$(psql "$DB_URL" -At -c "select count(*) from \"${t}\"")"
  [[ "${first}" -eq 1 ]] || json+=","
  first=0
  json+="\"${t}\":${count}"
done
json+=",\"capturedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
echo "${json}" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(s),null,2)));"

if [[ "${SAVE}" == true ]]; then
  mkdir -p "${ROOT}/backups"
  echo "${json}" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>require('fs').writeFileSync('${ROOT}/backups/row-counts-latest.json',JSON.stringify(JSON.parse(s),null,2)+'\n'));"
  echo "Saved ${ROOT}/backups/row-counts-latest.json"
fi
