/*
  Warnings:

  - You are about to alter the column `quantity` on the `PurchaseBillItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,2)` to `Decimal(14,3)`.

*/
-- AlterTable
ALTER TABLE "PurchaseBillItem" ADD COLUMN     "pricePerKg" DECIMAL(14,4),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(14,3);
