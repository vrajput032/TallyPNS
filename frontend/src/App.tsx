import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AdminRoute } from "@/features/auth/AdminRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { VendorsPage } from "@/features/vendors/VendorsPage";
import { SalesInvoicesPage } from "@/features/sales/SalesInvoicesPage";
import { SalesInvoiceFormPage } from "@/features/sales/SalesInvoiceFormPage";
import { SalesInvoiceDetailPage } from "@/features/sales/SalesInvoiceDetailPage";
import { PurchaseBillsPage } from "@/features/purchase/PurchaseBillsPage";
import { PurchaseBillFormPage } from "@/features/purchase/PurchaseBillFormPage";
import { PurchaseBillDetailPage } from "@/features/purchase/PurchaseBillDetailPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CashPage } from "@/features/cash/CashPage";
import { BankPage } from "@/features/bank/BankPage";
import { GstPage } from "@/features/gst/GstPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { RecycleBinPage } from "@/features/recycle-bin/RecycleBinPage";
import { UsersPage } from "@/features/users/UsersPage";
import { RawMaterialBillsPage } from "@/features/raw-material/RawMaterialBillsPage";
import { RawMaterialBillFormPage } from "@/features/raw-material/RawMaterialBillFormPage";
import { RawMaterialBillDetailPage } from "@/features/raw-material/RawMaterialBillDetailPage";
import { ThemeProvider } from "@/lib/theme";

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/sales" element={<SalesInvoicesPage />} />
                <Route path="/sales/new" element={<SalesInvoiceFormPage />} />
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
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/recycle-bin" element={<RecycleBinPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
