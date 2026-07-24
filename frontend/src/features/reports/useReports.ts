import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ProfitAndLoss {
  totalSales: number;
  totalPurchases: number;
  grossProfit: number;
  salesCount: number;
  purchaseCount: number;
}

export interface StockReportRow {
  id: string;
  name: string;
  hsn: string | null;
  unit: string;
  price: string;
  currentStock: string;
  stockValue: number;
}

export interface StockReport {
  rows: StockReportRow[];
  totalStockValue: number;
}

export interface BalanceSheet {
  asOn: string;
  assets: { name: string; amount: number }[];
  liabilities: { name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  notes: { totalSales: number; totalPurchases: number; grossProfit: number };
}

export interface TrialBalance {
  asOn: string;
  rows: { account: string; debit: number; credit: number }[];
  totalDebit: number;
  totalCredit: number;
}

export function useProfitAndLoss() {
  return useQuery({
    queryKey: ["reports", "profit-loss"],
    queryFn: async () => {
      const { data } = await api.get<ProfitAndLoss>("/reports/profit-loss");
      return data;
    },
  });
}

export function useStockReport() {
  return useQuery({
    queryKey: ["reports", "stock"],
    queryFn: async () => {
      const { data } = await api.get<StockReport>("/reports/stock");
      return data;
    },
  });
}

export function useBalanceSheet() {
  return useQuery({
    queryKey: ["reports", "balance-sheet"],
    queryFn: async () => {
      const { data } = await api.get<BalanceSheet>("/reports/balance-sheet");
      return data;
    },
  });
}

export function useTrialBalance() {
  return useQuery({
    queryKey: ["reports", "trial-balance"],
    queryFn: async () => {
      const { data } = await api.get<TrialBalance>("/reports/trial-balance");
      return data;
    },
  });
}
