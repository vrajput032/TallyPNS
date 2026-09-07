import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { InvestmentsPayload } from "@/features/investments/types";
import { api } from "@/lib/api";
import { apiErrorMessage, initialValueState, listPending, type ValueState } from "./helpers";

type FetchArgs = { silent?: boolean };

interface InvestmentsState {
  data: ValueState<InvestmentsPayload>;
}

const initialState: InvestmentsState = {
  data: initialValueState<InvestmentsPayload>(),
};

export const fetchInvestments = createAsyncThunk(
  "investments/fetch",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<InvestmentsPayload>("/investments");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const investmentsSlice = createSlice({
  name: "investments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvestments.pending, (state, action) => {
        state.data.status = listPending(
          state.data.status,
          state.data.value != null,
          action.meta.arg?.silent
        );
        state.data.error = null;
      })
      .addCase(fetchInvestments.fulfilled, (state, action) => {
        state.data = { value: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchInvestments.rejected, (state, action) => {
        state.data.status = "failed";
        state.data.error = String(action.payload ?? action.error.message);
      });
  },
});

export default investmentsSlice.reducer;
