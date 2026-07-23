import {
  Banknote,
  Building2,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Warehouse,
  FileText,
} from "lucide-react";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Sales", icon: TrendingUp },
  { to: "/purchase", label: "Purchase", icon: ShoppingCart },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/cash", label: "Cash", icon: Banknote },
  { to: "/bank", label: "Bank", icon: Building2 },
  { to: "/gst", label: "GST", icon: Receipt },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Package },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;
