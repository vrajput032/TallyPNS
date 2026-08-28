import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Customer, CustomerInput } from "@/features/customers/types";
import { api } from "@/lib/api";
import {
  apiErrorMessage,
  initialListState,
  listPending,
  type ListState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

export const fetchCustomers = createAsyncThunk(
  "customers/fetch",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Customer[]>("/customers");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createCustomer = createAsyncThunk(
  "customers/create",
  async (input: CustomerInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<Customer>("/customers", input);
      dispatch(fetchCustomers({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/update",
  async ({ id, input }: { id: string; input: CustomerInput }, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.put<Customer>(`/customers/${id}`, input);
      dispatch(fetchCustomers({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  "customers/delete",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/customers/${id}`);
      dispatch(fetchCustomers({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const customersSlice = createSlice({
  name: "customers",
  initialState: initialListState<Customer>(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state, action) => {
        state.status = listPending(state.status, state.items.length > 0, action.meta.arg?.silent);
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload ?? action.error.message);
      });
  },
});

export default customersSlice.reducer;
export type CustomersState = ListState<Customer>;
