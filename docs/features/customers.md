# Customers

**Routes:** `/customers`  
**Frontend:** `frontend/src/features/customers/`  
**Backend:** `backend/src/modules/customers/`  
**API:** `/api/customers` · **DB:** `Customer`

Master list of buyers.

- Fields: name, phone, email, GSTIN, address, opening balance
- Opening balance feeds **sundry debtors** on reports
- Linked to sales invoices and payment receipts
- Full list / create / edit; **delete is admin-only**
