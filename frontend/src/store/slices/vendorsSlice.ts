import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Vendor, VendorInput } from "@/features/vendors/types";
import { api } from "@/lib/api";
import { apiErrorMessage, initialListState, listPending } from "./helpers";

type FetchArgs = { silent?: boolean };

export const fetchVendors = createAsyncThunk(
  "vendors/fetch",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Vendor[]>("/vendors");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createVendor = createAsyncThunk(
  "vendors/create",
  async (input: VendorInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<Vendor>("/vendors", input);
      dispatch(fetchVendors({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const updateVendor = createAsyncThunk(
  "vendors/update",
  async ({ id, input }: { id: string; input: VendorInput }, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.put<Vendor>(`/vendors/${id}`, input);
      dispatch(fetchVendors({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteVendor = createAsyncThunk(
  "vendors/delete",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/vendors/${id}`);
      dispatch(fetchVendors({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const vendorsSlice = createSlice({
  name: "vendors",
  initialState: initialListState<Vendor>(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state, action) => {
        state.status = listPending(state.status, state.items.length > 0, action.meta.arg?.silent);
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload ?? action.error.message);
      });
  },
});

export default vendorsSlice.reducer;
