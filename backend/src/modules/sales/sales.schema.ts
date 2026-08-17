import { z } from "zod";
import { PIPE_SIZES_MM } from "../../lib/pipeSizes.js";

export const salesInvoiceItemSchema = z
  .object({
    productId: z.string().min(1).optional().nullable(),
    description: z.string().trim().max(200).optional().nullable(),
    hsn: z.string().trim().max(20).optional().nullable(),
    unit: z.string().trim().max(20).optional().nullable(),
    sizeMm: z
      .number()
      .refine((n) => (PIPE_SIZES_MM as readonly number[]).includes(n), "Select a valid size")
      .optional()
      .nullable(),
    quantity: z.number().positive(),
    rate: z.number().min(0),
    gstRate: z.number().min(0).max(100),
  })
  .superRefine((item, ctx) => {
    const hasProduct = Boolean(item.productId?.trim());
    const hasDescription = Boolean(item.description?.trim());
    if (!hasProduct && !hasDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a product or enter a manual description",
        path: ["description"],
      });
    }
  });

export const createSalesInvoiceSchema = z.object({
  customerId: z.string().min(1),
  invoiceNo: z.string().trim().max(60).optional(),
  invoiceDate: z.coerce.date().optional(),
  transport: z.string().trim().max(100).optional().nullable(),
  vehicleNo: z.string().trim().max(40).optional().nullable(),
  items: z.array(salesInvoiceItemSchema).min(1, "At least one item is required"),
});
