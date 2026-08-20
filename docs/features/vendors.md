# Vendors

**Routes:** `/vendors`  
**Frontend:** `frontend/src/features/vendors/`  
**Backend:** `backend/src/modules/vendors/`  
**API:** `/api/vendors` · **DB:** `Vendor`

Master list of catalog suppliers (finished-goods purchase, not raw-material steel bills).

- Same fields as customers
- Opening balance feeds **sundry creditors**
- Linked to purchase bills and vendor payments
- Full list / create / edit; **delete is admin-only**
