import { useValueQuery } from "@/store/hooks/useReduxData";
import { fetchDashboardSummary } from "@/store/slices/dashboardSlice";

export interface RawMaterialSummary {
  totalBilled: number;
  totalPaid: number;
  balance: number;
  billCount: number;
}

export interface TradingPnlMonth {
  key: string;
  label: string;
  sales: number;
  purchases: number;
  profit: number;
}

/** Trading sales vs trading purchase bills, before GST. */
export interface TradingPnlSummary {
  sales: number;
  purchases: number;
  profit: number;
  invoiceCount: number;
  billCount: number;
  months: TradingPnlMonth[];
}

export interface DashboardSummary {
  customerCount: number;
  productCount: number;
  stockValue: number;
  stockBySize: { sizeMm: number; quantity: number }[];
  lowStockCount: number;
  totalSales: number;
  pnsSales: number;
  tradingSales: number;
  tradingInvoiceCount: number;
  trading?: TradingPnlSummary;
  totalReceived: number;
  rawMaterial?: RawMaterialSummary;
}

export function useDashboardSummary() {
  return useValueQuery<DashboardSummary>((s) => s.dashboard.summary, fetchDashboardSummary);
}
