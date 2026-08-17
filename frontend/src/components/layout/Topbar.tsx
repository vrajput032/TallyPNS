import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";
import { SidebarNav } from "./SidebarNav";
import { TiltCard } from "@/lib/useTilt.tsx";
import { ENABLE_3D } from "@/lib/featureFlags";

export function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-1 md:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
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
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="truncate font-semibold">PNS ERP</span>
      </div>
      <div className="hidden md:block" />
      {ENABLE_3D ? (
        <TiltCard maxTilt={4} scale={1.01} speed={250} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="truncate text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="sr-only">Log out</span>
          </Button>
        </TiltCard>
      ) : (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="truncate text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      )}
    </header>
  );
}
