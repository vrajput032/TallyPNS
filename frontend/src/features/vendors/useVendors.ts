import { useListQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type { Vendor, VendorInput } from "@/features/vendors/types";
import {
  createVendor,
  deleteVendor,
  fetchVendors,
  updateVendor,
} from "@/store/slices/vendorsSlice";

export function useVendors() {
  return useListQuery<Vendor>((s) => s.vendors, fetchVendors);
}

export function useCreateVendor() {
  return useAsyncMutation<VendorInput, Vendor>(createVendor);
}

export function useUpdateVendor() {
  return useAsyncMutation<{ id: string; input: VendorInput }, Vendor>(updateVendor);
}

export function useDeleteVendor() {
  return useAsyncMutation<string, string>(deleteVendor);
}
