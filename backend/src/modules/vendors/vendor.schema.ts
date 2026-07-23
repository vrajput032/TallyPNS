import { z } from "zod";

export const createVendorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional(),
  address: z.string().optional(),
  openingBalance: z.number().default(0),
});

export const updateVendorSchema = createVendorSchema.partial();
