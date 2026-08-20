# Purchase bills

**Routes:** `/purchase`, `/purchase/new`, `/purchase/:id`, `/purchase/:id/edit`  
**Frontend:** `frontend/src/features/purchase/`  
**Backend:** `backend/src/modules/purchase/`  
**API:** `/api/purchase` · **DB:** `PurchaseBill`, `PurchaseBillItem`, `VendorPayment`

Catalog purchase from vendors (stock in). Separate from [raw-material](./raw-material.md) steel bills.

- Auto bill number: `PB-{year}-{seq}` (e.g. `PB-2026-0001`)
- Header: vendor, date, transport, vehicle number
- Lines: product, quantity (tons / product unit), optional **₹/kg** (rate = ₹/kg × 1000), GST %
- **Adds stock** (no size split on purchase — qty goes to product total)
- Print view for the bill
- **Payments:** record vendor payments (cash or bank). Status PENDING / PARTIAL / PAID
- Edit/delete: PIN; delete is soft + stock reverse; permanent delete is admin + PIN
