# Inventory

**Routes:** `/inventory`  
**Frontend:** `frontend/src/features/inventory/`  
**Backend:** `backend/src/modules/inventory/`  
**API:** `/api/inventory/stock`, `/movements`, `/adjustments` · **DB:** `Product`, `ProductSizeStock`, `StockMovement`

Stock of finished pipes by size.

- Per-product cards with qty for each size (95 / 110 / 90 / 55 / 85 mm)
- Product **photo** on the stock card (JPG/PNG/WEBP, max 10 MB) stored in Supabase Storage bucket `pns-products`
- Low-stock highlight when a size qty is below **100**
- **Adjustments:** signed qty + size + optional reason → `StockMovement` type `ADJUSTMENT`; updates both size stock and product `currentStock`
- Movement history: IN / OUT / ADJUSTMENT, with optional size and reason

Sales OUT is written when invoices are created, edited, or moved to/from the recycle bin. New purchase bills do **not** add pipe stock.
