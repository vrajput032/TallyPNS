import { z } from "zod";

export const purchaseBillItemSchema = z.object({
  productId: z.string().min(1),
  /** Quantity in Tons (or product unit) */
  quantity: z.number().positive(),
  /** ₹ per kg — used for MS raw material; rate is derived as pricePerKg × 1000 */
  pricePerKg: z.number().min(0).optional().nullable(),
  /** ₹ per Ton (or per unit) */
  rate: z.number().min(0),
  gstRate: z.number().min(0).max(100),
});

export const createPurchaseBillSchema = z.object({
  vendorId: z.string().min(1),
  billDate: z.coerce.date().optional(),
  transport: z.string().trim().max(100).optional().nullable(),
  vehicleNo: z.string().trim().max(40).optional().nullable(),
  items: z.array(purchaseBillItemSchema).min(1, "At least one item is required"),
});

export const KG_PER_TON = 1000;

export function rateFromPricePerKg(pricePerKg: number) {
  return Math.round(pricePerKg * KG_PER_TON * 100) / 100;
}
