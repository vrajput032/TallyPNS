import { useValueQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type {
  CashBankBook,
  CreateReceiptInput,
  CreateVendorPaymentInput,
  PartyOutstanding,
  PaymentReceipt,
  VendorPayment,
} from "@/features/payments/types";
import {
  createReceipt,
  createVendorPayment,
  deleteReceipt,
  deleteVendorPayment,
  fetchBankBook,
  fetchCashBook,
  fetchPartyOutstanding,
} from "@/store/slices/paymentsSlice";

export function useCashBook() {
  return useValueQuery<CashBankBook>((s) => s.payments.cash, fetchCashBook);
}

export function useBankBook() {
  return useValueQuery<CashBankBook>((s) => s.payments.bank, fetchBankBook);
}

export function usePartyOutstanding() {
  return useValueQuery<PartyOutstanding>((s) => s.payments.outstanding, fetchPartyOutstanding);
}

export function useCreateReceipt() {
  return useAsyncMutation<CreateReceiptInput, PaymentReceipt>(createReceipt);
}

export function useDeleteReceipt() {
  return useAsyncMutation<string, string>(deleteReceipt);
}

export function useCreateVendorPayment() {
  return useAsyncMutation<CreateVendorPaymentInput, VendorPayment>(createVendorPayment);
}

export function useDeleteVendorPayment() {
  return useAsyncMutation<string, string>(deleteVendorPayment);
}
