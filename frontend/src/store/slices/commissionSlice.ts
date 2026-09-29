import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CommissionEntryInput,
  CommissionPaymentInput,
  CommissionStatement,
  CommissionSummary,
} from "@/features/commission/types";
import { api } from "@/lib/api";
import { fetchBankBook, fetchCashBook } from "./paymentsSlice";
import { fetchPnlSummary } from "./profitLossSlice";
import { apiErrorMessage, initialValueState, listPending, type ValueState } from "./helpers";

type SummaryArgs = { month?: string; silent?: boolean };

interface CommissionState {
  /** Keyed by month (`YYYY-MM`) or "all" */
  summaries: Record<string, ValueState<CommissionSummary>>;
  statements: Record<string, ValueState<CommissionStatement>>;
}

const initialState: CommissionState = { summaries: {}, statements: {} };

export function commissionSummaryKey(month?: string) {
  return month || "all";
}

export const fetchCommissionSummary = createAsyncThunk(
  "commission/fetchSummary",
  async ({ month }: SummaryArgs, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CommissionSummary>("/commission", {
        params: month ? { month } : undefined,
      });
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchCommissionStatement = createAsyncThunk(
  "commission/fetchStatement",
  async ({ id }: { id: string; silent?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CommissionStatement>(`/commission/customers/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

/** After any change: refresh every loaded summary, this customer's statement, books and P&L. */
function refreshAfterChange(
  customerId: string,
  dispatch: (action: unknown) => unknown,
  getState: () => unknown,
  touchesBooks: boolean
) {
  const state = getState() as { commission: CommissionState };
  for (const key of Object.keys(state.commission.summaries)) {
    dispatch(fetchCommissionSummary({ month: key === "all" ? undefined : key, silent: true }));
  }
  dispatch(fetchCommissionStatement({ id: customerId, silent: true }));
  dispatch(fetchPnlSummary({ silent: true }));
  if (touchesBooks) {
    dispatch(fetchCashBook({ silent: true }));
    dispatch(fetchBankBook({ silent: true }));
  }
}

export const saveCommissionEntry = createAsyncThunk(
  "commission/saveEntry",
  async (
    { id, input }: { id?: string; input: CommissionEntryInput },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      const { data } = id
        ? await api.put(`/commission/entries/${id}`, input)
        : await api.post("/commission/entries", input);
      refreshAfterChange(input.customerId, dispatch, getState, false);
      return data as { id: string };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteCommissionEntry = createAsyncThunk(
  "commission/deleteEntry",
  async (
    { id, customerId }: { id: string; customerId: string },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      await api.delete(`/commission/entries/${id}`);
      refreshAfterChange(customerId, dispatch, getState, false);
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createCommissionPayment = createAsyncThunk(
  "commission/createPayment",
  async (input: CommissionPaymentInput, { rejectWithValue, dispatch, getState }) => {
    try {
      const { data } = await api.post<{ id: string; paymentNo: string }>("/commission/payments", input);
      refreshAfterChange(input.customerId, dispatch, getState, true);
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteCommissionPayment = createAsyncThunk(
  "commission/deletePayment",
  async (
    { id, customerId }: { id: string; customerId: string },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      await api.delete(`/commission/payments/${id}`);
      refreshAfterChange(customerId, dispatch, getState, true);
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const commissionSlice = createSlice({
  name: "commission",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommissionSummary.pending, (state, action) => {
        const key = commissionSummaryKey(action.meta.arg.month);
        const entry = state.summaries[key] ?? initialValueState<CommissionSummary>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.summaries[key] = entry;
      })
      .addCase(fetchCommissionSummary.fulfilled, (state, action) => {
        state.summaries[commissionSummaryKey(action.meta.arg.month)] = {
          value: action.payload,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchCommissionSummary.rejected, (state, action) => {
        const key = commissionSummaryKey(action.meta.arg.month);
        const entry = state.summaries[key] ?? initialValueState<CommissionSummary>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.summaries[key] = entry;
      })
      .addCase(fetchCommissionStatement.pending, (state, action) => {
        const key = action.meta.arg.id;
        const entry = state.statements[key] ?? initialValueState<CommissionStatement>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.statements[key] = entry;
      })
      .addCase(fetchCommissionStatement.fulfilled, (state, action) => {
        state.statements[action.meta.arg.id] = {
          value: action.payload,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchCommissionStatement.rejected, (state, action) => {
        const key = action.meta.arg.id;
        const entry = state.statements[key] ?? initialValueState<CommissionStatement>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.statements[key] = entry;
      });
  },
});

export default commissionSlice.reducer;
