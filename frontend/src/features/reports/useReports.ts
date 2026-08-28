import { useValueQuery } from "@/store/hooks/useReduxData";
import {
  fetchBalanceSheet,
  fetchProfitAndLoss,
  fetchStockReport,
  fetchTrialBalance,
} from "@/store/slices/reportsSlice";

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
  return useValueQuery<ProfitAndLoss>((s) => s.reports.profitLoss, fetchProfitAndLoss);
}

export function useStockReport() {
  return useValueQuery<StockReport>((s) => s.reports.stock, fetchStockReport);
}

export function useBalanceSheet() {
  return useValueQuery<BalanceSheet>((s) => s.reports.balanceSheet, fetchBalanceSheet);
}

export function useTrialBalance() {
  return useValueQuery<TrialBalance>((s) => s.reports.trialBalance, fetchTrialBalance);
}
