import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  BalanceSheet,
  ProfitAndLoss,
  StockReport,
  TrialBalance,
} from "@/features/reports/useReports";
import { api } from "@/lib/api";
import {
  apiErrorMessage,
  initialValueState,
  listPending,
  type ValueState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

interface ReportsState {
  profitLoss: ValueState<ProfitAndLoss>;
  stock: ValueState<StockReport>;
  balanceSheet: ValueState<BalanceSheet>;
  trialBalance: ValueState<TrialBalance>;
}

const initialState: ReportsState = {
  profitLoss: initialValueState(),
  stock: initialValueState(),
  balanceSheet: initialValueState(),
  trialBalance: initialValueState(),
};

export const fetchProfitAndLoss = createAsyncThunk(
  "reports/fetchProfitAndLoss",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ProfitAndLoss>("/reports/profit-loss");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchStockReport = createAsyncThunk(
  "reports/fetchStock",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<StockReport>("/reports/stock");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchBalanceSheet = createAsyncThunk(
  "reports/fetchBalanceSheet",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<BalanceSheet>("/reports/balance-sheet");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchTrialBalance = createAsyncThunk(
  "reports/fetchTrialBalance",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<TrialBalance>("/reports/trial-balance");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const bind = <T>(
      thunk: ReturnType<typeof createAsyncThunk<T, FetchArgs | undefined, object>>,
      key: keyof ReportsState
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

    bind(fetchProfitAndLoss, "profitLoss");
    bind(fetchStockReport, "stock");
    bind(fetchBalanceSheet, "balanceSheet");
    bind(fetchTrialBalance, "trialBalance");
  },
});

export default reportsSlice.reducer;
