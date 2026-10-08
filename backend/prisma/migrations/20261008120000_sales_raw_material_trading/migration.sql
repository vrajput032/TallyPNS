-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN "isRawMaterialTrading" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalesInvoice" ADD COLUMN "rawMaterialCostPerKg" DECIMAL(14,2);
