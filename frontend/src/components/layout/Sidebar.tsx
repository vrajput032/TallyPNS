import { isHeroTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./SidebarNav";

export function Sidebar() {
  const heroMode = isHeroTheme(useTheme().theme.name);

  return (
    <aside
      className={cn(
        "relative hidden w-56 shrink-0 overflow-hidden border-r md:sticky md:top-0 md:block md:h-screen",
        heroMode ? "border-border bg-sidebar" : "border-border/60 bg-sidebar",
      )}
    >
      {!heroMode ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-ring to-[var(--sidebar-primary)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-[color-mix(in_srgb,var(--sidebar-primary)_10%,transparent)]" />
        </>
      ) : null}
      <div className="relative flex h-full min-h-0 flex-col">
        <SidebarNav />
      </div>
    </aside>
  );
}
