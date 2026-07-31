-- DropForeignKey
ALTER TABLE "SalesInvoiceItem" DROP CONSTRAINT "SalesInvoiceItem_productId_fkey";

-- AlterTable
ALTER TABLE "SalesInvoiceItem" ADD COLUMN     "description" TEXT,
ADD COLUMN     "hsn" TEXT,
ADD COLUMN     "unit" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
