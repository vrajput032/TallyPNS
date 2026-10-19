import {
  Boxes,
  ChartNoAxesCombined,
  Factory,
  LayoutDashboard,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { isHeroTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type MobileTab = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  center?: boolean;
};

export const mobileTabItems: MobileTab[] = [
  { to: "/sales", label: "Sales", icon: ChartNoAxesCombined },
  { to: "/inventory", label: "Inventory", shortLabel: "Stock", icon: Boxes },
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
  const { theme } = useTheme();
  const heroMode = isHeroTheme(theme.name);

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 z-40 w-full max-w-[100vw] px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden print:hidden"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "pointer-events-auto relative mx-auto flex max-w-lg items-end justify-between gap-0.5 rounded-[28px] border px-1.5 pb-1.5 pt-2",
          "border-border/60 bg-card/75 shadow-[0_10px_40px_color-mix(in_srgb,var(--sidebar-primary)_18%,transparent)]",
          "backdrop-blur-2xl backdrop-saturate-150",
          "dark:border-white/10 dark:bg-card/70 dark:shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
        )}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-r from-primary/10 via-accent/35 to-[color-mix(in_srgb,var(--sidebar-primary)_12%,transparent)]" />
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-ring/70 to-transparent" />
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
                "relative z-[1] flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-2xl px-0.5 py-1.5 text-[10px] font-medium transition-all",
                center && "-mt-5 min-h-[4.25rem] justify-center gap-1 px-1 py-2",
                center
                  ? active
                    ? cn(
                        "bg-primary text-primary-foreground shadow-lg shadow-primary/35",
                        heroMode && "ring-2 ring-ring/80"
                      )
                    : "border border-border/70 bg-card/90 text-foreground shadow-md ring-1 ring-[color-mix(in_srgb,var(--sidebar-primary)_20%,transparent)]"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground active:scale-95"
              )}
            >
              <Icon className={cn("size-[1.125rem] shrink-0", center && "size-6")} />
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
