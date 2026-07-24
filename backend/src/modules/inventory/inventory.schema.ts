import { z } from "zod";

export const createAdjustmentSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  reason: z.string().optional(),
});
