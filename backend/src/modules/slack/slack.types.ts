export type SlackFlow = "bill" | "stock" | "raw_material";

export type SlackSessionBase = {
  flow: SlackFlow;
  dmChannelId: string;
  messageTs?: string;
};

export type SlackLineDraft = {
  isManual: boolean;
  productId?: string | null;
  description?: string | null;
  hsn?: string | null;
  unit?: string | null;
  sizeMm?: number | null;
  quantity: number;
  rate: number;
  gstRate: number;
};

export type SlackBillStep = "customer" | "product" | "size" | "after_line" | "review";

export type SlackBillSession = SlackSessionBase & {
  flow: "bill";
  step: SlackBillStep;
  customerId?: string;
  lines: SlackLineDraft[];
  draftProductId?: string;
  draftSizeMm?: number | null;
  transport: string;
};

export type SlackStockSession = SlackSessionBase & {
  flow: "stock";
  productId?: string;
  sizeMm?: number;
  direction?: "increase" | "decrease";
};

export type SlackRawMaterialLineDraft = {
  description: string;
  hsn?: string | null;
  quantityKg: number;
  ratePerKg: number;
};

export type SlackRawMaterialStep = "header" | "after_line" | "review";

export type SlackRawMaterialSession = SlackSessionBase & {
  flow: "raw_material";
  step: SlackRawMaterialStep;
  billNo?: string;
  supplierName?: string;
  supplierGstin?: string | null;
  vehicleNo?: string | null;
  destination?: string | null;
  lines: SlackRawMaterialLineDraft[];
};

export type SlackSession = SlackBillSession | SlackStockSession | SlackRawMaterialSession;
