import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GstRateBreakdown {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface GstSummary {
  outputGst: GstRateBreakdown[];
  inputGst: GstRateBreakdown[];
  totalOutputTax: number;
  totalInputTax: number;
  netPayable: number;
}

export function useGstSummary() {
  return useQuery({
    queryKey: ["gst", "summary"],
    queryFn: async () => {
      const { data } = await api.get<GstSummary>("/gst/summary");
      return data;
    },
  });
}
