import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { fetchCustomers } from "@/store/slices/customersSlice";
import { fetchProducts } from "@/store/slices/productsSlice";
import { fetchVendors } from "@/store/slices/vendorsSlice";
import { fetchSalesInvoices, fetchSalesInvoice } from "@/store/slices/salesSlice";
import { fetchPurchaseBills, fetchPurchaseBill } from "@/store/slices/purchaseSlice";
import { fetchStock, fetchStockMovements } from "@/store/slices/inventorySlice";
import {
  fetchDashboardSummary,
  fetchMonthlySales,
  fetchSalesByCustomer,
} from "@/store/slices/dashboardSlice";
import { fetchCashBook, fetchBankBook, fetchPartyOutstanding } from "@/store/slices/paymentsSlice";
import { fetchRawMaterialBills, fetchRawMaterialBill } from "@/store/slices/rawMaterialSlice";
import {
  fetchProfitAndLoss,
  fetchStockReport,
  fetchBalanceSheet,
  fetchTrialBalance,
} from "@/store/slices/reportsSlice";
import { fetchRecycleBin } from "@/store/slices/recycleBinSlice";
import { fetchUsers } from "@/store/slices/usersSlice";

const silent = { silent: true } as const;

/** Silently refresh Redux slice data when navigating between sections. */
export function SectionDataSync() {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const lastPath = useRef<string | null>(null);
  const prefetchedDashboard = useRef(false);

  // Warm dashboard chart data in the background when the app opens on another section.
  useEffect(() => {
    if (prefetchedDashboard.current) return;
    const section = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
    if (section === "dashboard" || section === "") return;
    prefetchedDashboard.current = true;
    dispatch(fetchDashboardSummary(silent));
    dispatch(fetchMonthlySales(silent));
    dispatch(fetchSalesByCustomer(silent));
  }, [dispatch, pathname]);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const section = pathname.split("/").filter(Boolean)[0] ?? "dashboard";

    switch (section) {
      case "dashboard":
      case "":
        dispatch(fetchDashboardSummary(silent));
        dispatch(fetchMonthlySales(silent));
        dispatch(fetchSalesByCustomer(silent));
        break;
      case "sales": {
        dispatch(fetchSalesInvoices(silent));
        const salesId = pathname.match(/^\/sales\/([^/]+)/)?.[1];
        if (salesId && salesId !== "new") {
          dispatch(fetchSalesInvoice({ id: salesId, silent: true }));
        }
        break;
      }
      case "purchase": {
        dispatch(fetchPurchaseBills(silent));
        const billId = pathname.match(/^\/purchase\/([^/]+)/)?.[1];
        if (billId && billId !== "new") {
          dispatch(fetchPurchaseBill({ id: billId, silent: true }));
        }
        break;
      }
      case "inventory":
        dispatch(fetchStock(silent));
        dispatch(fetchStockMovements(silent));
        dispatch(fetchProducts(silent));
        break;
      case "raw-material": {
        dispatch(fetchRawMaterialBills(silent));
        const rmId = pathname.match(/^\/raw-material\/([^/]+)/)?.[1];
        if (rmId && rmId !== "new") {
          dispatch(fetchRawMaterialBill({ id: rmId, silent: true }));
        }
        break;
      }
      case "cash":
        dispatch(fetchCashBook(silent));
        break;
      case "bank":
        dispatch(fetchBankBook(silent));
        break;
      case "customers":
        dispatch(fetchCustomers(silent));
        break;
      case "vendors":
        dispatch(fetchVendors(silent));
        break;
      case "products":
        dispatch(fetchProducts(silent));
        break;
      case "reports":
        dispatch(fetchProfitAndLoss(silent));
        dispatch(fetchStockReport(silent));
        dispatch(fetchBalanceSheet(silent));
        dispatch(fetchTrialBalance(silent));
        dispatch(fetchPartyOutstanding(silent));
        break;
      case "users":
        dispatch(fetchUsers(silent));
        break;
      case "recycle-bin":
        dispatch(fetchRecycleBin(silent));
        break;
      default:
        break;
    }
  }, [dispatch, pathname]);

  return null;
}
