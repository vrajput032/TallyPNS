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
