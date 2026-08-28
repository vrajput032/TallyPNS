import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CashBankBook,
  CreateReceiptInput,
  CreateVendorPaymentInput,
  PartyOutstanding,
  PaymentReceipt,
  VendorPayment,
} from "@/features/payments/types";
import { api } from "@/lib/api";
import { fetchSalesInvoices } from "./salesSlice";
import { fetchPurchaseBills } from "./purchaseSlice";
import { fetchDashboardSummary } from "./dashboardSlice";
import {
  apiErrorMessage,
  initialValueState,
  listPending,
  type ValueState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

interface PaymentsState {
  cash: ValueState<CashBankBook>;
  bank: ValueState<CashBankBook>;
  outstanding: ValueState<PartyOutstanding>;
}

const initialState: PaymentsState = {
  cash: initialValueState(),
  bank: initialValueState(),
  outstanding: initialValueState(),
};

export const fetchCashBook = createAsyncThunk(
  "payments/fetchCash",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CashBankBook>("/cash");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchBankBook = createAsyncThunk(
  "payments/fetchBank",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CashBankBook>("/bank");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchPartyOutstanding = createAsyncThunk(
  "payments/fetchOutstanding",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<PartyOutstanding>("/payments/outstanding");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createReceipt = createAsyncThunk(
  "payments/createReceipt",
  async (input: CreateReceiptInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<PaymentReceipt>("/payments/receipts", input);
      dispatch(fetchSalesInvoices({ silent: true }));
      dispatch(fetchCashBook({ silent: true }));
      dispatch(fetchBankBook({ silent: true }));
      dispatch(fetchPartyOutstanding({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteReceipt = createAsyncThunk(
  "payments/deleteReceipt",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/payments/receipts/${id}`);
      dispatch(fetchSalesInvoices({ silent: true }));
      dispatch(fetchCashBook({ silent: true }));
      dispatch(fetchBankBook({ silent: true }));
      dispatch(fetchPartyOutstanding({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createVendorPayment = createAsyncThunk(
  "payments/createVendorPayment",
  async (input: CreateVendorPaymentInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<VendorPayment>("/payments/vendor-payments", input);
      dispatch(fetchPurchaseBills({ silent: true }));
      dispatch(fetchCashBook({ silent: true }));
      dispatch(fetchBankBook({ silent: true }));
      dispatch(fetchPartyOutstanding({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteVendorPayment = createAsyncThunk(
  "payments/deleteVendorPayment",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/payments/vendor-payments/${id}`);
      dispatch(fetchPurchaseBills({ silent: true }));
      dispatch(fetchCashBook({ silent: true }));
      dispatch(fetchBankBook({ silent: true }));
      dispatch(fetchPartyOutstanding({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const bind = <T>(
      thunk: ReturnType<typeof createAsyncThunk<T, FetchArgs | undefined, object>>,
      key: keyof PaymentsState
    ) => {
      builder
        .addCase(thunk.pending, (state, action) => {
          const slot = state[key] as ValueState<T>;
          slot.status = listPending(slot.status, slot.value != null, action.meta.arg?.silent);
          slot.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          (state[key] as ValueState<T>) = {
            value: action.payload as T,
            status: "succeeded",
            error: null,
          };
        })
        .addCase(thunk.rejected, (state, action) => {
          const slot = state[key] as ValueState<T>;
          slot.status = "failed";
          slot.error = String(action.payload ?? action.error.message);
        });
    };

    bind(fetchCashBook, "cash");
    bind(fetchBankBook, "bank");
    bind(fetchPartyOutstanding, "outstanding");
  },
});

export default paymentsSlice.reducer;
