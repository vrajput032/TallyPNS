import { z } from "zod";

const customerFields = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional(),
  address: z.string().optional(),
  openingBalance: z.number().default(0),
  paymentTermDays: z.number().int().min(0).default(0),
  commissionType: z.enum(["PER_PIECE", "PERCENT", "PER_BILL"]).nullable().optional(),
  commissionRate: z.number().min(0).max(10_000_000).nullable().optional(),
});

function checkCommission(
  value: { commissionType?: string | null; commissionRate?: number | null },
  ctx: z.RefinementCtx
) {
  if (!value.commissionType) return;
  if (value.commissionRate == null || value.commissionRate <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter the commission rate", path: ["commissionRate"] });
  } else if (value.commissionType === "PERCENT" && value.commissionRate > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Percent must be 100 or less", path: ["commissionRate"] });
  }
}

export const createCustomerSchema = customerFields.superRefine(checkCommission);

export const updateCustomerSchema = customerFields.partial().superRefine(checkCommission);
