# Cash and bank

**Routes:** `/cash`, `/bank`  
**Frontend:** `frontend/src/features/cash/`, `frontend/src/features/bank/`, `frontend/src/features/payments/CashBankBookPage.tsx`  
**Backend:** `backend/src/modules/payments/` (`cashRouter`, `bankRouter`)  
**API:** `GET /api/cash`, `GET /api/bank` · **DB:** `PaymentReceipt`, `VendorPayment`

Live books, not stubs.

- **Cash book** — receipts and payments with `mode = CASH`
- **Bank book** — same for `BANK`
- Each row: in/out, voucher no, date, party, against invoice/bill, amount, reference, narration
- Totals: money in, money out, closing balance

Receipts (`RCP-10001+`) come from sales; payments (`PAY-10001+`) from vendor bills; raw-material payments (`RMP-`) are tracked on the raw-material module (dashboard balance), not mixed into these books.
