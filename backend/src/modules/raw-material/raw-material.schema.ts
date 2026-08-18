import { z } from "zod";

export const rawMaterialItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  hsn: z.string().trim().max(16).optional().nullable(),
  quantityKg: z.number().positive("Kg must be greater than 0"),
  ratePerKg: z.number().min(0),
  amount: z.number().min(0).optional(),
});

export const createRawMaterialBillSchema = z.object({
  billNo: z.string().trim().min(1).max(60),
  supplierName: z.string().trim().min(1).max(120),
  supplierGstin: z.string().trim().max(15).optional().nullable(),
  billDate: z.coerce.date().optional(),
  vehicleNo: z.string().trim().max(40).optional().nullable(),
  destination: z.string().trim().max(80).optional().nullable(),
  taxableAmount: z.number().min(0),
  cgstAmount: z.number().min(0).optional().default(0),
  sgstAmount: z.number().min(0).optional().default(0),
  igstAmount: z.number().min(0).optional().default(0),
  roundOff: z.number().optional().default(0),
  totalAmount: z.number().positive("Total must be greater than 0"),
  notes: z.string().trim().max(500).optional().nullable(),
  sourceFileName: z.string().trim().max(200).optional().nullable(),
  items: z.array(rawMaterialItemSchema).min(1, "Add at least one item"),
});

export const createRawMaterialPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  mode: z.enum(["CASH", "BANK"]),
  reference: z.string().trim().max(80).optional().nullable(),
  paymentDate: z.coerce.date().optional(),
  narration: z.string().trim().max(250).optional().nullable(),
});
