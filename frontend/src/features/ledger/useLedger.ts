import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useBlockingLoader, useValueQuery } from "@/store/hooks/useReduxData";
import { isValueLoading, type ValueState } from "@/store/slices/helpers";
import {
  fetchCustomerLedger,
  fetchLedgerList,
  fetchSupplierLedger,
  fetchSupplierLedgerList,
} from "@/store/slices/ledgerSlice";
import type { LedgerParty } from "./ledgerUi";
import type {
  CustomerLedger,
  LedgerBook,
  LedgerList,
  SupplierLedger,
  SupplierLedgerList,
} from "./types";

export function useLedgerList() {
  return useValueQuery<LedgerList>((s) => s.ledger.list, fetchLedgerList);
}

export function useSupplierLedgerList() {
  return useValueQuery<SupplierLedgerList>((s) => s.ledger.supplierList, fetchSupplierLedgerList);
}

/** Customer or supplier book reduced to what the detail and print pages render. */
export interface PartyLedgerView extends LedgerBook {
  party: LedgerParty;
  id: string;
  name: string;
  contactParts: string[];
  /** Other spellings of the supplier name found on raw material bills. */
  aliases: string[];
}

export function usePartyLedger(party: LedgerParty, partyId: string | undefined) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((s): ValueState<CustomerLedger | SupplierLedger> | undefined => {
    if (!partyId) return undefined;
    return party === "CUSTOMER"
      ? s.ledger.byCustomerId[partyId]
      : s.ledger.bySupplierKey[partyId];
  });

  const fetchOne = useCallback(
    (silent: boolean) => {
      if (!partyId) return;
      if (party === "CUSTOMER") dispatch(fetchCustomerLedger({ id: partyId, silent }));
      else dispatch(fetchSupplierLedger({ id: partyId, silent }));
    },
    [dispatch, party, partyId]
  );

  useEffect(() => {
    if (!partyId) return;
    if (!slot || slot.status === "idle") fetchOne(false);
  }, [fetchOne, partyId, slot?.status]);

  const refetch = useCallback(() => fetchOne(true), [fetchOne]);

  const isLoading = !partyId || !slot || isValueLoading(slot);
  useBlockingLoader(Boolean(partyId) && isLoading);

  const value = slot?.value ?? null;
  let data: PartyLedgerView | undefined;
  if (value && "customer" in value) {
    const { customer, ...book } = value;
    data = {
      ...book,
      party: "CUSTOMER",
      id: customer.id,
      name: customer.name,
      contactParts: [customer.phone, customer.gstin, customer.address].filter(
        (part): part is string => Boolean(part)
      ),
      aliases: [],
    };
  } else if (value && "supplier" in value) {
    const { supplier, ...book } = value;
    data = {
      ...book,
      party: "SUPPLIER",
      id: supplier.key,
      name: supplier.name,
      contactParts: supplier.gstin ? [supplier.gstin] : [],
      aliases: supplier.aliases.filter((alias) => alias !== supplier.name),
    };
  }

  return {
    data,
    isLoading,
    isFetching: slot?.status === "loading",
    isError: slot?.status === "failed",
    error: slot?.error ?? null,
    refetch,
  };
}
