import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { SalesPage } from "@/features/sales/SalesPage";
import { PurchasePage } from "@/features/purchase/PurchasePage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CashPage } from "@/features/cash/CashPage";
import { BankPage } from "@/features/bank/BankPage";
import { GstPage } from "@/features/gst/GstPage";
import { ReportsPage } from "@/features/reports/ReportsPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/purchase" element={<PurchasePage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/cash" element={<CashPage />} />
              <Route path="/bank" element={<BankPage />} />
              <Route path="/gst" element={<GstPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
