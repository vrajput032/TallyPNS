import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GstRateBreakdown {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface GstVoucherRow {
  id: string;
  date: string;
  particulars: string;
  vchType: "Sales" | "Purchase";
  vchNo: string;
  taxableAmount: number;
  taxAmount: number;
  invoiceAmount: number;
}

export interface GstPeriod {
  year: number;
  month: number;
  monthLabel: string;
  from: string;
  to: string;
  filingWindowFrom: string;
  filingDueDate: string;
  filingNote: string;
  filingStatus: "upcoming" | "open" | "overdue";
}

export interface GstSummary {
  period: GstPeriod;
  outputGst: GstRateBreakdown[];
  inputGst: GstRateBreakdown[];
  totalOutputTax: number;
  totalInputTax: number;
  totalTaxableSales: number;
  netPayable: number;
  salesVoucherCount: number;
  purchaseVoucherCount: number;
  gstr1Vouchers: GstVoucherRow[];
  purchaseVouchers: GstVoucherRow[];
}

export function useGstSummary(month: number, year: number) {
  return useQuery({
    queryKey: ["gst", "summary", month, year],
    queryFn: async () => {
      const { data } = await api.get<GstSummary>("/gst/summary", {
        params: { month, year },
      });
      return data;
    },
  });
}
