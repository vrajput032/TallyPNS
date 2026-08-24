# Purchase bills

**Routes:** `/purchase`, `/purchase/new`, `/purchase/:id`, `/purchase/:id/edit`  
**Frontend:** `frontend/src/features/purchase/`  
**Backend:** `backend/src/modules/purchase/`  
**API:** `/api/purchase` · **DB:** `PurchaseBill`, `PurchaseBillItem`, `PurchaseAttachment`, `VendorPayment`

Bills for **machines and equipment** (CNC, Traub, etc.). This is **not** pipe stock and **not** customers.

- Pipe / catalog stock is **not** entered here (use Inventory adjustments and Raw material)
- Parties are **suppliers (vendors)**, never customers
- Auto bill number: `PB-{year}-{seq}`
- Lines: free-text description, qty, rate, GST
- Optional supplier invoice number and notes
- **Attachments:** PDF or image (JPG/PNG/WEBP), max 10 MB, Supabase Storage `pns-purchase`
- **Payments:** vendor payments (cash or bank)
- Edit/delete: PIN; delete is admin + PIN. Does not change pipe stock for new bills
