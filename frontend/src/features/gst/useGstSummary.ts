import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { isValueLoading } from "@/store/slices/helpers";
import { fetchGstSummary, gstPeriodKey } from "@/store/slices/gstSlice";

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
  const dispatch = useAppDispatch();
  const key = gstPeriodKey(month, year);
  const slot = useAppSelector((s) => s.gst.byPeriod[key]);

  useEffect(() => {
    if (!slot || slot.status === "idle") {
      dispatch(fetchGstSummary({ month, year }));
    }
  }, [dispatch, month, year, slot?.status, key]);

  const refetch = useCallback(() => {
    dispatch(fetchGstSummary({ month, year, silent: true }));
  }, [dispatch, month, year]);

  return {
    data: slot?.value ?? undefined,
    isLoading: !slot || isValueLoading(slot),
    isFetching: slot?.status === "loading",
    isError: slot?.status === "failed",
    error: slot?.error ?? null,
    refetch,
  };
}
