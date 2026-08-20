# Products

**Routes:** `/products`  
**Frontend:** `frontend/src/features/products/`  
**Backend:** `backend/src/modules/products/`  
**API:** `/api/products` · **DB:** `Product`, `ProductSizeStock`

Finished-goods catalog (pipes and other stock items).

- Fields: name, HSN, GST rate, unit (default `PCS`), price, opening stock, current stock
- Current stock is the **sum across sizes**; per-size qty lives in `ProductSizeStock`
- Used on sales (catalog lines) and purchase bills
- Full list / create / edit; **delete is admin-only**

Pipe sizes in the catalog: **95, 110, 90, 55, 45 mm** (`backend/src/lib/pipeSizes.ts`).
