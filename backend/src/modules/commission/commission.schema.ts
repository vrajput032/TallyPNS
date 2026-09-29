import { z } from "zod";

export const yearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

export const commissionEntrySchema = z.object({
  customerId: z.string().min(1),
  month: yearMonthSchema,
  amount: z.number().positive("Enter an amount").max(100_000_000),
  note: z.string().trim().max(300).optional().nullable(),
});

export const commissionPaymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive("Enter an amount").max(100_000_000),
  mode: z.enum(["CASH", "BANK"]),
  reference: z.string().trim().max(100).optional().nullable(),
  paymentDate: z.coerce.date().optional(),
  narration: z.string().trim().max(300).optional().nullable(),
});
