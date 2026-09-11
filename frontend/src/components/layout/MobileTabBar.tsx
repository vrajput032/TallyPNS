import {
  Factory,
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type MobileTab = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  center?: boolean;
};

export const mobileTabItems: MobileTab[] = [
  { to: "/sales", label: "Sales", icon: TrendingUp },
  { to: "/inventory", label: "Inventory", shortLabel: "Stock", icon: Warehouse },
  { to: "/", label: "Dashboard", icon: LayoutDashboard, center: true },
  { to: "/purchase", label: "Purchase", icon: ShoppingCart },
  { to: "/raw-material", label: "Raw material", shortLabel: "Raw mat.", icon: Factory },
];

function isTabActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 z-40 w-full max-w-[100vw] overflow-x-hidden px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden print:hidden"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "pointer-events-auto relative mx-auto flex max-w-lg items-end justify-between gap-0.5 rounded-[28px] border px-1.5 pb-1.5 pt-2",
          "border-white/30 bg-white/55 shadow-[0_10px_40px_rgba(15,23,42,0.14)]",
          "backdrop-blur-2xl backdrop-saturate-150",
          "dark:border-white/10 dark:bg-zinc-900/55 dark:shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
        )}
      >
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20" />
        {mobileTabItems.map(({ to, label, shortLabel, icon: Icon, center }) => {
          const active = isTabActive(pathname, to);

          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-2xl px-0.5 py-1.5 text-[10px] font-medium transition-all",
                center && "-mt-5 min-h-[4.25rem] justify-center gap-1 px-1 py-2",
                center
                  ? active
                    ? "bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/20 backdrop-blur-md"
                    : "border border-white/35 bg-white/70 text-foreground shadow-md ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:ring-white/10"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground active:scale-95"
              )}
            >
              <Icon
                className={cn("size-[1.125rem] shrink-0", center && "size-6", active && !center && "stroke-[2.5]")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={cn("max-w-full truncate leading-none", center && "text-[9px] sm:text-[10px]")}>
                {shortLabel ?? label}
              </span>
              {active && !center ? (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden />
              ) : null}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
