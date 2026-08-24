-- CreateEnum
CREATE TYPE "PurchaseBillKind" AS ENUM ('CATALOG', 'EQUIPMENT');

-- AlterTable Product: optional image in Supabase Storage
ALTER TABLE "Product" ADD COLUMN "imagePath" TEXT;
ALTER TABLE "Product" ADD COLUMN "imageMime" TEXT;

-- AlterTable PurchaseBill
ALTER TABLE "PurchaseBill" ADD COLUMN "kind" "PurchaseBillKind" NOT NULL DEFAULT 'CATALOG';
ALTER TABLE "PurchaseBill" ADD COLUMN "supplierInvoiceNo" TEXT;
ALTER TABLE "PurchaseBill" ADD COLUMN "notes" TEXT;

-- AlterTable PurchaseBillItem: optional catalog product for equipment lines
ALTER TABLE "PurchaseBillItem" DROP CONSTRAINT "PurchaseBillItem_productId_fkey";
ALTER TABLE "PurchaseBillItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "PurchaseBillItem" ADD COLUMN "description" TEXT;
ALTER TABLE "PurchaseBillItem" ADD CONSTRAINT "PurchaseBillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PurchaseAttachment" (
    "id" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PurchaseAttachment_purchaseBillId_idx" ON "PurchaseAttachment"("purchaseBillId");
CREATE INDEX "PurchaseBill_kind_idx" ON "PurchaseBill"("kind");

ALTER TABLE "PurchaseAttachment" ADD CONSTRAINT "PurchaseAttachment_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
