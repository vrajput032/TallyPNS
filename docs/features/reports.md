# Reports

**Routes:** `/reports`  
**Frontend:** `frontend/src/features/reports/`  
**Backend:** `backend/src/modules/reports/`  
**API:** `/api/reports/profit-loss`, `/stock`, `/balance-sheet`, `/trial-balance` and `/api/payments/outstanding`

| Tab | What it shows |
|-----|----------------|
| **Profit & Loss** | Total sales, total purchases, gross profit, voucher counts |
| **Stock** | Each product: qty, rate, stock value; total stock value |
| **Outstanding** | Debtors (customers) and creditors (vendors) including opening balances |
| **Balance sheet** | Assets: cash, bank, debtors, stock. Liabilities: creditors, balancing capital |
| **Trial balance** | Ledger-style debit/credit from the same figures |

Optional date filters: P&L `from`/`to`; balance sheet and trial balance `asOn`.
