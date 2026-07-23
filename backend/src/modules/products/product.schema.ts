import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1),
  hsn: z.string().optional(),
  gstRate: z.number().default(0),
  unit: z.string().default("PCS"),
  price: z.number().default(0),
  openingStock: z.number().default(0),
  currentStock: z.number().default(0),
});

export const updateProductSchema = createProductSchema.partial();
