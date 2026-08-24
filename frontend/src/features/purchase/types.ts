import type { Product } from "@/features/products/types";
import type { Vendor } from "@/features/vendors/types";

export type PurchaseBillKind = "CATALOG" | "EQUIPMENT";

export interface PurchaseAttachment {
  id: string;
  purchaseBillId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  url?: string;
  createdAt: string;
}

export interface PurchaseBillItem {
  id: string;
  productId: string | null;
  product: Product | null;
  description: string | null;
  quantity: string;
  pricePerKg: string | null;
  rate: string;
  gstRate: string;
  amount: string;
}

export interface PurchaseBill {
  id: string;
  billNo: string;
  vendorId: string | null;
  vendor: Vendor | null;
  kind: PurchaseBillKind;
  billDate: string;
  transport: string | null;
  vehicleNo: string | null;
  supplierInvoiceNo: string | null;
  supplierGstin: string | null;
  notes: string | null;
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
  attachments?: PurchaseAttachment[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBillItemInput {
  productId?: string | null;
  description?: string | null;
  quantity: number;
  pricePerKg?: number | null;
  rate: number;
  gstRate: number;
}

export interface PurchaseBillInput {
  vendorId?: string | null;
  kind?: PurchaseBillKind;
  transport?: string | null;
  vehicleNo?: string | null;
  supplierInvoiceNo?: string | null;
  supplierGstin?: string | null;
  notes?: string | null;
  items: PurchaseBillItemInput[];
}

export function purchaseLineLabel(item: PurchaseBillItem) {
  if (item.product?.name) return item.product.name;
  if (item.description?.trim()) return item.description.trim();
  return "Item";
}
