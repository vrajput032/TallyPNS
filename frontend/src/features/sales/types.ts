import type { Customer } from "@/features/customers/types";
import type { Product } from "@/features/products/types";

export interface SalesInvoiceItem {
  id: string;
  productId: string;
  product: Product;
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
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoiceItemInput {
  productId: string;
  sizeMm?: number | null;
  quantity: number;
  rate: number;
  gstRate: number;
}

export interface SalesInvoiceInput {
  customerId: string;
  transport?: string | null;
  vehicleNo?: string | null;
  items: SalesInvoiceItemInput[];
}
