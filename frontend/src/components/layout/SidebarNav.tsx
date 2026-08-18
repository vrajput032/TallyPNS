import { NavLink } from "react-router-dom";
import { canDelete } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { navItems } from "./nav-items";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const items = navItems.filter((item) => !("adminOnly" in item && item.adminOnly) || canDelete(user));

  return (
    <>
      <div className="flex h-14 items-center border-b px-4 font-semibold">PNS ERP</div>
      <nav className="flex flex-col gap-1 p-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
