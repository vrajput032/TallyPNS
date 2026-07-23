import { z } from "zod";

export const purchaseBillItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  gstRate: z.number().min(0).max(100),
});

export const createPurchaseBillSchema = z.object({
  vendorId: z.string().min(1),
  billDate: z.coerce.date().optional(),
  items: z.array(purchaseBillItemSchema).min(1, "At least one item is required"),
});
