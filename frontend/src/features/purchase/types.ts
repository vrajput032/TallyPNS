import type { Product } from "@/features/products/types";
import type { Vendor } from "@/features/vendors/types";

export interface PurchaseBillItem {
  id: string;
  productId: string;
  product: Product;
  quantity: string;
  pricePerKg: string | null;
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
  transport: string | null;
  vehicleNo: string | null;
  totalAmount: string;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  payments?: {
    id: string;
    paymentNo: string;
    amount: string;
    mode: "CASH" | "BANK";
    reference: string | null;
    paymentDate: string;
    narration: string | null;
  }[];
  items: PurchaseBillItem[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBillItemInput {
  productId: string;
  quantity: number;
  pricePerKg?: number | null;
  rate: number;
  gstRate: number;
}

export interface PurchaseBillInput {
  vendorId: string;
  transport?: string | null;
  vehicleNo?: string | null;
  items: PurchaseBillItemInput[];
}
