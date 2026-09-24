import type { Product } from "@/features/products/types";
import type { Vendor } from "@/features/vendors/types";

export type PurchaseBillKind = "CATALOG" | "EQUIPMENT" | "TRADING" | "RUNNING_COST";

/** Kinds a user can create; CATALOG is legacy and shown with equipment. */
export type PurchaseSection = "EQUIPMENT" | "TRADING" | "RUNNING_COST";

export const PURCHASE_SECTIONS: PurchaseSection[] = ["EQUIPMENT", "TRADING", "RUNNING_COST"];

export function purchaseSectionOf(kind: PurchaseBillKind): PurchaseSection {
  switch (kind) {
    case "CATALOG":
    case "EQUIPMENT":
      return "EQUIPMENT";
    case "TRADING":
    case "RUNNING_COST":
      return kind;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function purchaseSectionLabel(section: PurchaseSection): string {
  switch (section) {
    case "EQUIPMENT":
      return "Equipment";
    case "TRADING":
      return "Trading";
    case "RUNNING_COST":
      return "Running cost";
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

export function parsePurchaseSection(value: string | null | undefined): PurchaseSection | null {
  const upper = value?.toUpperCase().replace(/-/g, "_");
  return PURCHASE_SECTIONS.find((section) => section === upper) ?? null;
}

export interface ParsedSupplierInvoiceItem {
  description: string;
  hsn: string | null;
  unit: string | null;
  quantity: number;
  rate: number;
  gstRate: number;
  amount: number;
}

export interface ParsedSupplierInvoice {
  supplierName: string | null;
  supplierGstin: string | null;
  supplierInvoiceNo: string | null;
  billDate: string | null;
  vehicleNo: string | null;
  items: ParsedSupplierInvoiceItem[];
  taxableAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  warnings: string[];
  sourceFileName: string;
}

export interface RunningCostMonth {
  key: string;
  label: string;
  pnlLines: { id: string; label: string; amount: number }[];
  pnlTotal: number;
  entries: {
    id: string;
    billNo: string;
    title: string | null;
    billDate: string;
    totalAmount: number;
  }[];
  entriesTotal: number;
  total: number;
}

export interface RunningCostsSummary {
  months: RunningCostMonth[];
  totals: { pnl: number; entries: number; combined: number };
}

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
  title: string | null;
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
  billDate?: string;
  transport?: string | null;
  vehicleNo?: string | null;
  supplierInvoiceNo?: string | null;
  supplierGstin?: string | null;
  title?: string | null;
  notes?: string | null;
  items: PurchaseBillItemInput[];
}

export function purchaseBillTitle(bill: Pick<PurchaseBill, "title" | "supplierInvoiceNo" | "billNo">) {
  const title = bill.title?.trim();
  if (title) return title;
  const invoice = bill.supplierInvoiceNo?.trim();
  if (invoice) return invoice;
  return bill.billNo;
}

export function purchaseLineLabel(item: PurchaseBillItem) {
  if (item.product?.name) return item.product.name;
  if (item.description?.trim()) return item.description.trim();
  return "Item";
}
