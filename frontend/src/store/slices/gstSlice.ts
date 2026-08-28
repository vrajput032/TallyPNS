import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { GstSummary } from "@/features/gst/useGstSummary";
import { api } from "@/lib/api";
import { apiErrorMessage, initialValueState, listPending, type ValueState } from "./helpers";

type FetchArgs = { month: number; year: number; silent?: boolean };

interface GstState {
  byPeriod: Record<string, ValueState<GstSummary>>;
}

const initialState: GstState = {
  byPeriod: {},
};

function periodKey(month: number, year: number) {
  return `${year}-${month}`;
}

export const fetchGstSummary = createAsyncThunk(
  "gst/fetchSummary",
  async ({ month, year }: FetchArgs, { rejectWithValue }) => {
    try {
      const { data } = await api.get<GstSummary>("/gst/summary", { params: { month, year } });
      return { key: periodKey(month, year), data };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const gstSlice = createSlice({
  name: "gst",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGstSummary.pending, (state, action) => {
        const key = periodKey(action.meta.arg.month, action.meta.arg.year);
        const entry = state.byPeriod[key] ?? initialValueState<GstSummary>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.byPeriod[key] = entry;
      })
      .addCase(fetchGstSummary.fulfilled, (state, action) => {
        state.byPeriod[action.payload.key] = {
          value: action.payload.data,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchGstSummary.rejected, (state, action) => {
        const key = periodKey(action.meta.arg.month, action.meta.arg.year);
        const entry = state.byPeriod[key] ?? initialValueState<GstSummary>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.byPeriod[key] = entry;
      });
  },
});

export default gstSlice.reducer;
export { periodKey as gstPeriodKey };
