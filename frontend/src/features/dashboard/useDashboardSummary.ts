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
  gst: number;
  profit: number;
}

/** Trading sales vs trading purchase bills (with GST). Profit = sales − purchases − gst. */
export interface TradingPnlSummary {
  sales: number;
  purchases: number;
  /** Output GST minus input GST; negative means a GST credit. */
  gst: number;
  profit: number;
  invoiceCount: number;
  billCount: number;
  months: TradingPnlMonth[];
}

/** Raw material resold by kg; "purchases" is kg × the ₹/kg saved on each invoice, plus GST. */
export interface RawMaterialTradingPnlSummary {
  sales: number;
  purchases: number;
  gst: number;
  profit: number;
  kg: number;
  invoiceCount: number;
  months: TradingPnlMonth[];
}

export interface IndusPoLineProgress {
  sizeMm: number;
  description: string;
  ordered: number;
  supplied: number;
}

export interface IndusPoSummary {
  poNo: string;
  poDate: string;
  customerName: string | null;
  customerId: string | null;
  previousPoQuantity: number;
  previousPoFrom: string;
  previousPoTo: string;
  previousSupplied: number;
  lastMonthLeft: number;
  poQuantity: number;
  target: number;
  supplied: number;
  remaining: number;
  invoiceCount: number;
  lines: IndusPoLineProgress[];
  otherSupplied: number;
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
  rawMaterialTrading?: RawMaterialTradingPnlSummary;
  indusPo?: IndusPoSummary;
  totalReceived: number;
  rawMaterial?: RawMaterialSummary;
}

export function useDashboardSummary() {
  return useValueQuery<DashboardSummary>((s) => s.dashboard.summary, fetchDashboardSummary);
}
