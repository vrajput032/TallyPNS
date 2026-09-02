import type { SalesInvoiceInput } from "./types";

export type InvoiceLineDraft = {
  isManual: boolean;
  productId?: string;
  description?: string;
  hsn?: string;
  unit?: string;
  sizeMm?: number | null;
  quantity: number;
  rate: number;
  gstRate: number;
};

export function lineAmount(line: InvoiceLineDraft) {
  const base = line.quantity * line.rate;
  return base + (base * line.gstRate) / 100;
}

export function invoiceGrandTotal(items: InvoiceLineDraft[]) {
  return items.reduce((sum, item) => sum + lineAmount(item), 0);
}

export function buildSalesInvoicePayload(
  customerId: string,
  items: InvoiceLineDraft[],
  options?: { invoiceNo?: string; transport?: string; vehicleNo?: string }
): SalesInvoiceInput {
  return {
    customerId,
    invoiceNo: options?.invoiceNo?.trim() || undefined,
    transport: options?.transport?.trim() || "REGULAR",
    vehicleNo: options?.vehicleNo?.trim() || undefined,
    items: items.map((item) => {
      if (item.isManual) {
        return {
          productId: null,
          description: item.description?.trim() || null,
          hsn: item.hsn?.trim() || null,
          unit: item.unit?.trim() || "NOS",
          sizeMm: null,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
        };
      }
      return {
        productId: item.productId,
        description: null,
        hsn: null,
        unit: null,
        sizeMm:
          item.sizeMm != null && !Number.isNaN(item.sizeMm) && item.sizeMm > 0
            ? item.sizeMm
            : null,
        quantity: item.quantity,
        rate: item.rate,
        gstRate: item.gstRate,
      };
    }),
  };
}
