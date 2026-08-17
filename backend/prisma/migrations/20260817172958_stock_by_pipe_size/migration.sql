-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "sizeMm" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "ProductSizeStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeMm" DECIMAL(10,2) NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSizeStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSizeStock_sizeMm_idx" ON "ProductSizeStock"("sizeMm");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSizeStock_productId_sizeMm_key" ON "ProductSizeStock"("productId", "sizeMm");

-- AddForeignKey
ALTER TABLE "ProductSizeStock" ADD CONSTRAINT "ProductSizeStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
