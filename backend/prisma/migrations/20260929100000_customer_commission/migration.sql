-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PER_PIECE', 'PERCENT', 'PER_BILL');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "commissionType" "CommissionType",
ADD COLUMN "commissionRate" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN "commissionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPayment" (
    "id" TEXT NOT NULL,
    "paymentNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "reference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionEntry_customerId_idx" ON "CommissionEntry"("customerId");

-- CreateIndex
CREATE INDEX "CommissionEntry_month_idx" ON "CommissionEntry"("month");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayment_paymentNo_key" ON "CommissionPayment"("paymentNo");

-- CreateIndex
CREATE INDEX "CommissionPayment_customerId_idx" ON "CommissionPayment"("customerId");

-- CreateIndex
CREATE INDEX "CommissionPayment_paymentDate_idx" ON "CommissionPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "CommissionPayment_mode_idx" ON "CommissionPayment"("mode");

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayment" ADD CONSTRAINT "CommissionPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
