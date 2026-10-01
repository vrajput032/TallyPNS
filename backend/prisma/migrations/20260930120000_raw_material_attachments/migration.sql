-- CreateTable
CREATE TABLE "RawMaterialAttachment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawMaterialAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawMaterialAttachment_billId_idx" ON "RawMaterialAttachment"("billId");

-- AddForeignKey
ALTER TABLE "RawMaterialAttachment" ADD CONSTRAINT "RawMaterialAttachment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "RawMaterialBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RawMaterialAttachment" ENABLE ROW LEVEL SECURITY;
