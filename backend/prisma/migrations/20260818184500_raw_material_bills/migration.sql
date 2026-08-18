-- CreateTable
CREATE TABLE "RawMaterialBill" (
    "id" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierGstin" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleNo" TEXT,
    "destination" TEXT,
    "taxableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalKg" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sourceFileName" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterialBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterialBillItem" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsn" TEXT,
    "quantityKg" DECIMAL(14,3) NOT NULL,
    "ratePerKg" DECIMAL(14,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "RawMaterialBillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterialPayment" (
    "id" TEXT NOT NULL,
    "paymentNo" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "reference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterialPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterialBill_billNo_key" ON "RawMaterialBill"("billNo");

-- CreateIndex
CREATE INDEX "RawMaterialBill_deletedAt_idx" ON "RawMaterialBill"("deletedAt");

-- CreateIndex
CREATE INDEX "RawMaterialBill_billDate_idx" ON "RawMaterialBill"("billDate");

-- CreateIndex
CREATE INDEX "RawMaterialBill_supplierName_idx" ON "RawMaterialBill"("supplierName");

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterialPayment_paymentNo_key" ON "RawMaterialPayment"("paymentNo");

-- CreateIndex
CREATE INDEX "RawMaterialPayment_billId_idx" ON "RawMaterialPayment"("billId");

-- CreateIndex
CREATE INDEX "RawMaterialPayment_paymentDate_idx" ON "RawMaterialPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "RawMaterialPayment_mode_idx" ON "RawMaterialPayment"("mode");

-- AddForeignKey
ALTER TABLE "RawMaterialBillItem" ADD CONSTRAINT "RawMaterialBillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "RawMaterialBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialPayment" ADD CONSTRAINT "RawMaterialPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "RawMaterialBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
