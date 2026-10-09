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
import { useIsCompactNav } from "@/hooks/useIsMobile";
import { ENABLE_3D } from "@/lib/featureFlags";
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
  const { title: routeTitle, backTo: routeBackTo, backLabel } = getMobileHeaderMeta(pathname);
  const headerOverride = useMobileHeaderStore((state) => state.override);
  const title = headerOverride?.title ?? routeTitle;
  const subtitle = headerOverride?.subtitle;
  const backTo = salesBackTarget(routeBackTo, pathname, search);
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
          "z-40 flex min-h-16 w-full max-w-[100vw] items-center justify-between gap-2 overflow-x-hidden border-b border-border/40 bg-card/60 px-3 py-2.5 backdrop-blur-xl backdrop-saturate-150 sm:px-4 sm:py-3",
          isCompactNav
            ? "fixed left-0 right-0 top-0 pt-[env(safe-area-inset-top,0px)]"
            : "sticky top-0",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/15" />
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-4 bg-gradient-to-b from-foreground/5 to-transparent dark:from-foreground/10" />

        {/* Mobile: centered title with balanced left/right controls */}
        <div className="relative flex w-full items-center md:hidden">
          <div className="z-10 shrink-0">{leftNavButton}</div>
          <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center justify-center px-14 text-center leading-tight">
            <h1 className="w-full truncate text-base font-semibold">{title}</h1>
            {subtitle ? (
              <p className="w-full truncate text-xs font-normal text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="z-10 ml-auto shrink-0">{accountButton}</div>
        </div>

        <div className="hidden md:block" />
        {ENABLE_3D ? (
          <TiltCard maxTilt={4} scale={1.01} speed={250} className="hidden md:block">
            {desktopActions}
          </TiltCard>
        ) : (
          <div className="hidden md:block">{desktopActions}</div>
        )}
      </header>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />

      {isCompactNav ? (
        <div
          aria-hidden
          className="h-[calc(4rem+env(safe-area-inset-top,0px))] shrink-0"
        />
      ) : null}
    </>
  );
}
