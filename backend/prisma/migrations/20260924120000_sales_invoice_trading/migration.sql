-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN "isTrading" BOOLEAN NOT NULL DEFAULT false;

-- First trading invoice (RED STAR INDUSTRIES)
UPDATE "SalesInvoice" SET "isTrading" = true WHERE "invoiceNo" = 'PNS/26-27/24';
