import { NavLink } from "react-router-dom";
import { SIDEBAR_LOGO, SIDEBAR_MARK } from "@/features/dashboard/heroAssets";
import { canDelete } from "@/lib/permissions";
import { isHeroTheme, isSteelTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { navItems } from "./nav-items";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const heroMode = isHeroTheme(theme.name);
  const steel = isSteelTheme(theme.name);
  const items = navItems.filter((item) => !("adminOnly" in item && item.adminOnly) || canDelete(user));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-3 font-semibold tracking-tight">
        {heroMode ? (
          <img src={SIDEBAR_LOGO} alt="PNS ERP" className="h-10 w-auto max-w-full object-contain object-left" />
        ) : (
          <>
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-ring to-[var(--sidebar-primary)] text-[10px] font-bold text-white shadow-sm">
              P
            </span>
            <span className="text-sm font-bold text-foreground">PNS ERP</span>
          </>
        )}
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                isActive
                  ? heroMode
                    ? cn(
                        "border-l-[3px] border-[#E8B83D] text-white shadow-sm",
                        steel
                          ? "bg-gradient-to-r from-[#C91F32] to-[#173B57]"
                          : "bg-gradient-to-r from-[#D91F32] to-[#0756A6]"
                      )
                    : "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      {heroMode ? (
        <div className="mt-auto flex shrink-0 justify-center px-3 pb-3 pt-2">
          <img src={SIDEBAR_MARK} alt="Man of steel" className="h-24 w-auto max-w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
