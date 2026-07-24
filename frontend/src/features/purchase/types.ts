import type { Product } from "@/features/products/types";
import type { Vendor } from "@/features/vendors/types";

export interface PurchaseBillItem {
  id: string;
  productId: string;
  product: Product;
  quantity: string;
  rate: string;
  gstRate: string;
  amount: string;
}

export interface PurchaseBill {
  id: string;
  billNo: string;
  vendorId: string;
  vendor: Vendor;
  billDate: string;
  totalAmount: string;
  items: PurchaseBillItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBillItemInput {
  productId: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export interface PurchaseBillInput {
  vendorId: string;
  items: PurchaseBillItemInput[];
}
