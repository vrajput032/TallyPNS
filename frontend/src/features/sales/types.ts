import type { Customer } from "@/features/customers/types";
import type { Product } from "@/features/products/types";

export interface SalesInvoiceItem {
  id: string;
  productId: string | null;
  product: Product | null;
  description: string | null;
  hsn: string | null;
  unit: string | null;
  sizeMm: string | null;
  quantity: string;
  rate: string;
  gstRate: string;
  amount: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customer: Customer;
  invoiceDate: string;
  transport: string | null;
  vehicleNo: string | null;
  totalAmount: string;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  receipts?: {
    id: string;
    receiptNo: string;
    amount: string;
    mode: "CASH" | "BANK";
    reference: string | null;
    receiptDate: string;
    narration: string | null;
  }[];
  items: SalesInvoiceItem[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoiceItemInput {
  productId?: string | null;
  description?: string | null;
  hsn?: string | null;
  unit?: string | null;
  sizeMm?: number | null;
  quantity: number;
  rate: number;
  gstRate: number;
}

export interface SalesInvoiceInput {
  customerId: string;
  invoiceNo?: string;
  transport?: string | null;
  vehicleNo?: string | null;
  items: SalesInvoiceItemInput[];
}

export function salesItemDescription(item: SalesInvoiceItem) {
  if (item.product?.name) {
    const size =
      item.sizeMm != null && Number(item.sizeMm) > 0 ? ` ${Number(item.sizeMm)}mm` : "";
    return `${item.product.name}${size}`;
  }
  return item.description?.trim() || "Item";
}

export function salesItemHsn(item: SalesInvoiceItem) {
  return item.product?.hsn ?? item.hsn ?? "-";
}

export function salesItemUnit(item: SalesInvoiceItem) {
  return item.product?.unit ?? item.unit ?? "NOS";
}
