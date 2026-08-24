-- Rename catalog size 45mm → 85mm. Merge stock when both rows exist for a product.

-- 1) Add 45mm qty into existing 85mm rows
UPDATE "ProductSizeStock" AS target
SET quantity = target.quantity + source.quantity
FROM "ProductSizeStock" AS source
WHERE target."productId" = source."productId"
  AND target."sizeMm" = 85
  AND source."sizeMm" = 45;

-- 2) Drop 45mm rows that now duplicate an 85mm row
DELETE FROM "ProductSizeStock" AS source
USING "ProductSizeStock" AS target
WHERE source."productId" = target."productId"
  AND source."sizeMm" = 45
  AND target."sizeMm" = 85;

-- 3) Rename remaining 45mm stock rows to 85mm
UPDATE "ProductSizeStock"
SET "sizeMm" = 85
WHERE "sizeMm" = 45;

-- 4) Historical movements and sales lines
UPDATE "StockMovement"
SET "sizeMm" = 85
WHERE "sizeMm" = 45;

UPDATE "SalesInvoiceItem"
SET "sizeMm" = 85
WHERE "sizeMm" = 45;
