import type { Customer } from "@/features/customers/types";
import type { Product } from "@/features/products/types";

export interface SalesInvoiceItem {
  id: string;
  productId: string;
  product: Product;
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
  totalAmount: string;
  items: SalesInvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoiceItemInput {
  productId: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export interface SalesInvoiceInput {
  customerId: string;
  items: SalesInvoiceItemInput[];
}
