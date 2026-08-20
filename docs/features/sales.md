# Sales invoices

**Routes:** `/sales`, `/sales/new`, `/sales/:id`, `/sales/:id/edit`  
**Frontend:** `frontend/src/features/sales/`  
**Backend:** `backend/src/modules/sales/`  
**API:** `/api/sales` · **DB:** `SalesInvoice`, `SalesInvoiceItem`, `PaymentReceipt`

GST tax invoices to customers.

- Auto invoice number: `PNS/{FY}/{seq}` (Indian FY Apr–Mar, e.g. `PNS/26-27/1`). Can be overridden.
- Header: customer, date, transport, vehicle number
- Line types:
  - **Catalog** — product, optional size (mm), qty, rate, GST %; **deducts stock** for that size
  - **Manual** — free description (scraps, construction, electricity, etc.), optional HSN/unit; **no stock**
- Totals include GST (CGST/SGST split on print). Amount in words.
- Print view matches a GST tax invoice (company header, GSTIN, bank details).
- **Payments:** record receipts (cash or bank) against the invoice. Status: PENDING / PARTIAL / PAID. Cannot overpay.
- Edit and delete require the deletion PIN. Delete is **soft** (recycle bin) and reverses stock. Permanent delete is admin + PIN.
