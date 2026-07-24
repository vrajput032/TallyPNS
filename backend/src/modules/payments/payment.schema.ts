import { z } from "zod";

export const createReceiptSchema = z.object({
  salesInvoiceId: z.string().min(1),
  amount: z.number().positive("Amount must be greater than 0"),
  mode: z.enum(["CASH", "BANK"]),
  reference: z.string().trim().max(80).optional().nullable(),
  receiptDate: z.coerce.date().optional(),
  narration: z.string().trim().max(250).optional().nullable(),
});

export const createVendorPaymentSchema = z.object({
  purchaseBillId: z.string().min(1),
  amount: z.number().positive("Amount must be greater than 0"),
  mode: z.enum(["CASH", "BANK"]),
  reference: z.string().trim().max(80).optional().nullable(),
  paymentDate: z.coerce.date().optional(),
  narration: z.string().trim().max(250).optional().nullable(),
});
