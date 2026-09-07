import { Provider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AdminRoute } from "@/features/auth/AdminRoute";
import { LoginBackGuard } from "@/features/auth/LoginBackGuard";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { LedgerPage } from "@/features/ledger/LedgerPage";
import { LedgerDetailPage } from "@/features/ledger/LedgerDetailPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { SalesInvoicesPage } from "@/features/sales/SalesInvoicesPage";
import { SalesInvoiceFormPage } from "@/features/sales/SalesInvoiceFormPage";
import { SalesInvoiceDetailPage } from "@/features/sales/SalesInvoiceDetailPage";
import { SalesInvoicesMonthPrintPage } from "@/features/sales/SalesInvoicesMonthPrintPage";
import { PurchaseBillsPage } from "@/features/purchase/PurchaseBillsPage";
import { PurchaseBillFormPage } from "@/features/purchase/PurchaseBillFormPage";
import { PurchaseBillDetailPage } from "@/features/purchase/PurchaseBillDetailPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CashPage } from "@/features/cash/CashPage";
import { BankPage } from "@/features/bank/BankPage";
import { GstPage } from "@/features/gst/GstPage";
import { ProfitLossPage } from "@/features/profit-loss/ProfitLossPage";
import { InvestmentsPage } from "@/features/investments/InvestmentsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { RecycleBinPage } from "@/features/recycle-bin/RecycleBinPage";
import { UsersPage } from "@/features/users/UsersPage";
import { RawMaterialBillsPage } from "@/features/raw-material/RawMaterialBillsPage";
import { RawMaterialBillFormPage } from "@/features/raw-material/RawMaterialBillFormPage";
import { RawMaterialBillDetailPage } from "@/features/raw-material/RawMaterialBillDetailPage";
import { SlowApiOverlay } from "@/components/loading/SlowApiOverlay";
import { store } from "@/store/store";
import { ThemeProvider } from "@/lib/theme";


export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <LoginBackGuard />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/sales" element={<SalesInvoicesPage />} />
                <Route path="/sales/new" element={<SalesInvoiceFormPage />} />
                <Route path="/sales/print-month" element={<SalesInvoicesMonthPrintPage />} />
                <Route path="/sales/:id/edit" element={<SalesInvoiceFormPage />} />
                <Route path="/sales/:id" element={<SalesInvoiceDetailPage />} />
                <Route path="/purchase" element={<PurchaseBillsPage />} />
                <Route path="/purchase/new" element={<PurchaseBillFormPage />} />
                <Route path="/purchase/:id/edit" element={<PurchaseBillFormPage />} />
                <Route path="/purchase/:id" element={<PurchaseBillDetailPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/raw-material" element={<RawMaterialBillsPage />} />
                <Route path="/raw-material/new" element={<RawMaterialBillFormPage />} />
                <Route path="/raw-material/:id/edit" element={<RawMaterialBillFormPage />} />
                <Route path="/raw-material/:id" element={<RawMaterialBillDetailPage />} />
                <Route path="/cash" element={<CashPage />} />
                <Route path="/bank" element={<BankPage />} />
                <Route path="/gst" element={<GstPage />} />
                <Route path="/profit-loss" element={<ProfitLossPage />} />
                <Route path="/investments" element={<InvestmentsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/ledger" element={<LedgerPage />} />
                <Route path="/ledger/:customerId" element={<LedgerDetailPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/recycle-bin" element={<RecycleBinPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <SlowApiOverlay />
        <Toaster />
      </ThemeProvider>
    </Provider>
  );
}
