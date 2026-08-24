import { z } from "zod";

export const purchaseBillItemSchema = z.object({
  /** Ignored for new bills — purchase is equipment only, not pipe catalog */
  productId: z.string().min(1).optional().nullable(),
  description: z.string().trim().min(1, "Enter what was purchased (e.g. CNC / Traub)").max(200),
  quantity: z.number().positive(),
  pricePerKg: z.number().min(0).optional().nullable(),
  rate: z.number().min(0),
  gstRate: z.number().min(0).max(100).default(0),
});

export const createPurchaseBillSchema = z.object({
  vendorId: z.string().min(1).optional().nullable(),
  kind: z.enum(["CATALOG", "EQUIPMENT"]).default("EQUIPMENT"),
  billDate: z.coerce.date().optional(),
  transport: z.string().trim().max(100).optional().nullable(),
  vehicleNo: z.string().trim().max(40).optional().nullable(),
  supplierInvoiceNo: z.string().trim().max(80).optional().nullable(),
  supplierGstin: z.string().trim().max(15).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(purchaseBillItemSchema).min(1, "At least one item is required"),
});

export const KG_PER_TON = 1000;

export function rateFromPricePerKg(pricePerKg: number) {
  return Math.round(pricePerKg * KG_PER_TON * 100) / 100;
}
