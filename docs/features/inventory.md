# Inventory

**Routes:** `/inventory`  
**Frontend:** `frontend/src/features/inventory/`  
**Backend:** `backend/src/modules/inventory/`  
**API:** `/api/inventory/stock`, `/movements`, `/adjustments` · **DB:** `Product`, `ProductSizeStock`, `StockMovement`

Stock of finished pipes by size.

- Per-product cards with qty for each size (95 / 110 / 90 / 55 / 45 mm)
- Low-stock highlight when a size qty is below **100**
- **Adjustments:** signed qty + size + optional reason → `StockMovement` type `ADJUSTMENT`; updates both size stock and product `currentStock`
- Movement history: IN (purchase), OUT (sales), ADJUSTMENT, with optional size and reason

Sales OUT and purchase IN are written automatically when invoices/bills are created, edited, or moved to/from the recycle bin.
