# Google Sheets backup

**Routes:** Users page (admin button only)  
**Frontend:** `frontend/src/features/users/UsersPage.tsx` (Sync Google Sheet)  
**Backend:** `backend/src/modules/sheets/`  
**API:** `/api/sheets` · **DB:** none (read-only mirror)

One-way live backup from Postgres → a Google Spreadsheet. **Not** a restore source; use `npm run db:backup` / `db:restore` for disaster recovery.

## Spreadsheet

Default workbook: [Tally](https://docs.google.com/spreadsheets/d/1JodzZIfLaQktBO0P9bAsMxtpZ9Fwuivc-lUrIFyyhJE/edit)

| Tab | Contents |
|-----|----------|
| Sales | Invoice header + line items in one row (incl. paid/balance/`PENDING`\|`PARTIAL`\|`PAID`, trading flag, commission, raw-material trading flag and ₹/kg cost) |
| sales receipts | Customer receipts against invoices |
| Purchase | Active purchase bills (incl. paid/balance/status) |
| purchase items | Purchase bill lines |
| purchase payments | Vendor payments against purchase bills |
| raw material | Active raw-material bills (incl. paid/balance/status, source file) |
| raw material items | Raw-material bill lines (kg, ₹/kg) |
| raw material payments | Payments against raw-material bills |
| attachments | Uploaded purchase / raw-material files (name, bucket, storage path) |
| customer | Customer master (incl. payment terms, commission rule) |
| ledger | Customer ledger summary (opening, billed, paid, closing) |
| vendor | Vendor master |
| product | Product catalog + current stock |
| size stock | Stock per product and pipe size (mm) |
| stock movements | Stock IN / OUT / ADJUSTMENT history |
| commission entries | Monthly lump-sum commission |
| commission payments | Commission paid out (cash / bank) |
| running cost overrides | Manual monthly P&L running-cost amounts |
| recycle bin | Soft-deleted sales / purchase / raw-material bills |
| activity | Newest 5,000 activity-log entries |

Soft-deleted bills appear only in **recycle bin** (their lines, payments and files are omitted). Users / logins and push subscriptions are never written to the sheet. The sheet is **overwritten** on each sync: all tabs are loaded from the DB first, then cleared and rewritten in one batch. Missing tabs are created automatically.

## When it updates

1. **After writes** — sales, purchase, raw material, customers, vendors, products, stock adjustments, commission, running-cost overrides, and related payments call `scheduleSheetsSync()` (debounced ~2.5s, fire-and-forget). Failures are logged only; they do **not** fail the HTTP request or roll back DB work.
2. **Manual** — admin `POST /api/sheets/sync` or **Users → Sync Google Sheet**.
3. **CLI** — `npm run sheets:sync` (local, with backend `.env`).
4. **Optional cron** — `POST /api/sheets/cron` with header `X-Sheets-Cron-Secret` matching `GOOGLE_SHEETS_CRON_SECRET`.

If Google env vars are missing, sync is skipped (`enabled: false`). App behaviour is unchanged.

## Config

| Env | Purpose |
|-----|---------|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email (share the sheet as Editor) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | JSON `private_key` (`\n` escaped as `\\n` in `.env`) |
| `GOOGLE_SHEETS_CRON_SECRET` | Optional shared secret for `/api/sheets/cron` |

Cloud project used: `pns-tally`, service account `pns-sheets@pns-tally.iam.gserviceaccount.com`. Set the same vars on **Render** for production sync.

## Safety

- No Prisma migrations or schema changes
- Sync runs **after** successful DB writes only
- Errors from Google are caught; API responses stay the same
- Offline CSV export remains: `npm run db:export:sheets`
