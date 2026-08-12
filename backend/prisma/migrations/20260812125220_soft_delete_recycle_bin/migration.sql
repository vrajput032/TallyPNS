-- AlterTable
ALTER TABLE "PurchaseBill" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PurchaseBill_deletedAt_idx" ON "PurchaseBill"("deletedAt");

-- CreateIndex
CREATE INDEX "SalesInvoice_deletedAt_idx" ON "SalesInvoice"("deletedAt");
