# Raw material

**Routes:** `/raw-material`, `/raw-material/new`, `/raw-material/:id`, `/raw-material/:id/edit`  
**Frontend:** `frontend/src/features/raw-material/`  
**Backend:** `backend/src/modules/raw-material/`  
**API:** `/api/raw-material` · **DB:** `RawMaterialBill`, `RawMaterialBillItem`, `RawMaterialPayment`

Supplier **steel / MS tube** bills in **kg**, separate from catalog [purchase](./purchase.md).

- Manual entry or **PDF upload parse** (max 8 MB) to prefill bill no, supplier, GSTIN, date, vehicle, destination, kg, rates, GST
- Fields: bill no (unique, from the supplier invoice), supplier name/GSTIN, date, vehicle, destination, taxable, CGST/SGST/IGST, round-off, total, notes
- Line items: description, HSN, kg, ₹/kg, amount
- **Yield hint:** kg × pieces-per-kg for 95 mm (9.1) and 110 mm (8.33) — display only, does not post finished stock (`backend/src/lib/rawMaterialYield.ts`)
- Payments against the bill (`RMP-{seq}`), cash or bank
- Payment status PENDING / PARTIAL / PAID
- Soft-delete with PIN (admin). Not listed in the recycle-bin UI (sales/purchase only)
