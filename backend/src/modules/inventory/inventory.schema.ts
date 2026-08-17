import { z } from "zod";
import { PIPE_SIZES_MM } from "../../lib/pipeSizes.js";

export const createAdjustmentSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  sizeMm: z.number().refine((n) => (PIPE_SIZES_MM as readonly number[]).includes(n), {
    message: "Select a valid size",
  }),
  reason: z.string().optional(),
});
