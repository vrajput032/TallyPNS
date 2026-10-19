import { ArrowLeft, CircleUser, KeyRound, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BackgroundSyncIndicator } from "@/components/loading/BackgroundSyncIndicator";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import { useIsCompactNav } from "@/hooks/useIsMobile";
import { ENABLE_3D } from "@/lib/featureFlags";
import { isHeroTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/lib/useTilt.tsx";
import { clearLocalAppCache } from "@/lib/clearLocalAppCache";
import { useAuthStore } from "@/store/authStore";
import { ChangePasswordDialog } from "@/features/auth/ChangePasswordDialog";
import { PaymentRemindersMenu } from "@/features/notifications/PaymentRemindersMenu";
import { salesBackTarget } from "@/features/sales/salesFilters";
import { AccountMenu } from "./AccountMenu";
import { getMobileHeaderMeta } from "./mobileHeader";
import { useMobileHeaderStore } from "./mobileHeaderStore";
import { GlobalSearch } from "./GlobalSearch";
import { SidebarNav } from "./SidebarNav";

type TopbarProps = {
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  rightOpen: boolean;
  onRightOpenChange: (open: boolean) => void;
};

export function Topbar({
  leftOpen,
  onLeftOpenChange,
  rightOpen,
  onRightOpenChange,
}: TopbarProps) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const isCompactNav = useIsCompactNav();
  const { theme } = useTheme();
  const mergedHero = pathname === "/" && isHeroTheme(theme.name);
  const { title: routeTitle, backTo: routeBackTo, backLabel } = getMobileHeaderMeta(pathname);
  const headerOverride = useMobileHeaderStore((state) => state.override);
  const title = headerOverride?.title ?? routeTitle;
  const subtitle = headerOverride?.subtitle;
  const backTo = salesBackTarget(routeBackTo, pathname, search);
  const backgroundSync = useBackgroundSync();
  const logout = useAuthStore((state) => state.logout);
  const [passwordOpen, setPasswordOpen] = useState(false);

  function openChangePassword() {
    onRightOpenChange(false);
    setPasswordOpen(true);
  }

  function handleLogout() {
    void clearLocalAppCache();
    logout();
    navigate("/login", { replace: true });
  }

  const accountButton = (
    <Sheet open={rightOpen} onOpenChange={onRightOpenChange}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
            <CircleUser className="size-5" />
            <span className="sr-only">Open account menu</span>
          </Button>
        }
      />
      <SheetContent side="right" className="w-72 p-0">
        <SheetTitle className="sr-only">Account</SheetTitle>
        <AccountMenu onLogout={handleLogout} onChangePassword={openChangePassword} />
      </SheetContent>
    </Sheet>
  );

  const leftNavButton = backTo ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0"
      onClick={() => navigate(backTo)}
      aria-label={backLabel ?? "Back"}
    >
      <ArrowLeft className="size-5" />
    </Button>
  ) : (
    <Sheet open={leftOpen} onOpenChange={onLeftOpenChange}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="shrink-0">
            <Menu className="size-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarNav onNavigate={() => onLeftOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );

  const desktopActions = (
    <div className="flex shrink-0 items-center gap-0.5">
      <PaymentRemindersMenu />
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={openChangePassword}
        title="Change password"
      >
        <KeyRound className="size-4" />
        <span className="sr-only">Change password</span>
      </Button>
      <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}>
        <LogOut className="size-4" />
        <span className="sr-only">Log out</span>
      </Button>
    </div>
  );

  return (
    <>
      <header
        className={cn(
          "relative z-30 flex min-h-16 w-full max-w-[100vw] items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3",
          mergedHero ? "overflow-visible" : "overflow-x-hidden",
          mergedHero
            ? "relative border-0 bg-transparent shadow-none"
            : "border-b border-border/50 bg-card/70 backdrop-blur-xl backdrop-saturate-150",
          mergedHero && isCompactNav && "pt-[env(safe-area-inset-top,0px)]",
          !mergedHero && isCompactNav && "fixed left-0 right-0 top-0 pt-[env(safe-area-inset-top,0px)]",
          !mergedHero && !isCompactNav && "sticky top-0",
        )}
      >
        {mergedHero ? null : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/12 via-accent/40 to-[color-mix(in_srgb,var(--sidebar-primary)_14%,transparent)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ring/80 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary via-ring to-[var(--sidebar-primary)] opacity-80" />
          </>
        )}
        <div className="relative z-10 hidden min-w-0 flex-1 justify-center px-3 md:flex">
          <GlobalSearch shortcut={!isCompactNav} showHint className="w-full max-w-xl" />
        </div>

        {/* Mobile: menu, and on the dashboard a static search, then account */}
        <div className="relative z-10 flex w-full items-center gap-2 md:hidden">
          <div className={cn("z-10 shrink-0", mergedHero && "rounded-full bg-card/80 shadow-sm")}>{leftNavButton}</div>
          {mergedHero ? (
            <GlobalSearch shortcut={isCompactNav} className="min-w-0 flex-1" />
          ) : (
            <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center justify-center px-11 text-center leading-tight">
              <h1 className="w-full truncate text-base font-semibold">{title}</h1>
              {backgroundSync !== "idle" ? (
                <BackgroundSyncIndicator state={backgroundSync} variant="inline" className="max-w-full justify-center" />
              ) : subtitle ? (
                <p className="w-full truncate text-xs font-normal text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          )}
          <div className={cn("z-10 ml-auto shrink-0", mergedHero && "rounded-full bg-card/80 shadow-sm")}>{accountButton}</div>
        </div>

        <div className="relative z-10 hidden min-w-0 md:block">
          {backgroundSync !== "idle" ? (
            <BackgroundSyncIndicator state={backgroundSync} variant="pill" />
          ) : null}
        </div>
        {ENABLE_3D ? (
          <TiltCard maxTilt={4} scale={1.01} speed={250} className="relative z-10 hidden md:block">
            {desktopActions}
          </TiltCard>
        ) : (
          <div className="relative z-10 hidden md:block">{desktopActions}</div>
        )}
      </header>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />

      {isCompactNav && !mergedHero ? (
        <div
          aria-hidden
          className="h-[calc(4rem+env(safe-area-inset-top,0px))] shrink-0"
        />
      ) : null}
    </>
  );
}
