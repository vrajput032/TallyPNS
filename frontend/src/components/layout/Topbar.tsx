import { CircleUser, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ENABLE_3D } from "@/lib/featureFlags";
import { TiltCard } from "@/lib/useTilt.tsx";
import { useAuthStore } from "@/store/authStore";
import { AccountMenu } from "./AccountMenu";
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
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const actions = (
    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <Button variant="ghost" size="icon" className="hidden shrink-0 md:inline-flex" onClick={handleLogout}>
        <LogOut className="size-4" />
        <span className="sr-only">Log out</span>
      </Button>
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
          <AccountMenu onLogout={handleLogout} />
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/40 bg-card/60 px-3 backdrop-blur-xl backdrop-saturate-150 sm:px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/15" />
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-4 bg-gradient-to-b from-foreground/5 to-transparent dark:from-foreground/10" />
      <div className="flex min-w-0 items-center gap-1 md:hidden">
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
        <span className="truncate font-semibold">PNS ERP</span>
      </div>
      <div className="hidden md:block" />
      {ENABLE_3D ? (
        <TiltCard maxTilt={4} scale={1.01} speed={250}>
          {actions}
        </TiltCard>
      ) : (
        actions
      )}
    </header>
  );
}
