# GST

**Routes:** `/gst`  
**Frontend:** `frontend/src/features/gst/`  
**Backend:** `backend/src/modules/gst/`  
**API:** `GET /api/gst/summary`, `GET /api/gst/gstr1-json`

Month picker (calendar month). GSTR-1 due = **11th of the next month**.

- Output GST (sales) and input GST (purchase) by rate, with CGST/SGST split
- Taxable sales, net GST payable (output − input)
- Voucher lists: GSTR-1 (outward) and purchase vouchers
- Filing status: upcoming / open / overdue
- **Download GSTR-1 JSON** in Tally-style format for GST portal “Prepare Offline”
- Links to gst.gov.in / returns login

Raw-material bills are **not** included in this GST summary (catalog sales + catalog purchase only).
