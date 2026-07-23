import { z } from "zod";

export const salesInvoiceItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  gstRate: z.number().min(0).max(100),
});

export const createSalesInvoiceSchema = z.object({
  customerId: z.string().min(1),
  invoiceDate: z.coerce.date().optional(),
  items: z.array(salesInvoiceItemSchema).min(1, "At least one item is required"),
});
