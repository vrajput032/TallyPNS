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

## List filters (`/sales`)

- **Month / All** toggle, plus these filters (combined with AND, applied in the browser):
  - **Customer** — customers that have at least one invoice
  - **Search** — invoice number, customer name or vehicle number
  - **Payment** — All, Unpaid (pending + partial), Pending, Partial, Paid
  - **Type** — Factory + trading, Factory only, Trading only
  - **Due** — Any, Overdue, Due in 7 days (only invoices with a balance and a customer payment term)
- **Clear** resets all filters. Totals (pieces, amount) follow the filtered list.
- Desktop shows the filter row under the month controls; mobile opens it from the **Filters** button (badge = number of active filters).
- Filters live in the URL (`customer`, `q`, `status`, `type`, `due`), so they survive opening an invoice and going back.
- **Download PDF** (`/sales/print-totals`) applies the same filters and names them in the heading. **Download bills** (`/sales/print-month`) always prints every bill of the month.
