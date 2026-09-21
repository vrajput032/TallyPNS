export type ActivityModule =
  | "SALES"
  | "PURCHASE"
  | "RAW_MATERIAL"
  | "INVENTORY"
  | "PAYMENT";

export type ActivityAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "RESTORED"
  | "PAYMENT_RECORDED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_DELETED"
  | "STOCK_ADJUSTED";

export interface ActivityLog {
  id: string;
  createdAt: string;
  userId: string | null;
  actorName: string;
  module: ActivityModule;
  action: ActivityAction;
  entityId: string | null;
  entityNo: string | null;
  summary: string;
  amount: number | null;
  href: string | null;
}

export function activityModuleLabel(module: ActivityModule): string {
  switch (module) {
    case "SALES":
      return "Sales";
    case "PURCHASE":
      return "Purchase";
    case "RAW_MATERIAL":
      return "Raw material";
    case "INVENTORY":
      return "Inventory";
    case "PAYMENT":
      return "Payment";
    default: {
      const _exhaustive: never = module;
      return _exhaustive;
    }
  }
}

export function activityActionLabel(action: ActivityAction): string {
  switch (action) {
    case "CREATED":
      return "Created";
    case "UPDATED":
      return "Updated";
    case "DELETED":
      return "Deleted";
    case "RESTORED":
      return "Restored";
    case "PAYMENT_RECORDED":
      return "Payment recorded";
    case "PAYMENT_UPDATED":
      return "Payment updated";
    case "PAYMENT_DELETED":
      return "Payment deleted";
    case "STOCK_ADJUSTED":
      return "Stock adjusted";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
