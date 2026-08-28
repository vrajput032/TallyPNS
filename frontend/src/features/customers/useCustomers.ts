import { useListQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type { Customer, CustomerInput } from "@/features/customers/types";
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
} from "@/store/slices/customersSlice";

export function useCustomers() {
  return useListQuery<Customer>((s) => s.customers, fetchCustomers);
}

export function useCreateCustomer() {
  return useAsyncMutation<CustomerInput, Customer>(createCustomer);
}

export function useUpdateCustomer() {
  return useAsyncMutation<{ id: string; input: CustomerInput }, Customer>(updateCustomer);
}

export function useDeleteCustomer() {
  return useAsyncMutation<string, string>(deleteCustomer);
}
