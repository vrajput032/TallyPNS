import { LogOut, Menu } from "lucide-react";
import { useEffect, useState, useRef } from "react";
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
  const logout = useAuthStore((state) => state.logout);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [parallax, setParallax] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!headerRef.current) return;
      const y = window.scrollY;
      setParallax(y * 0.35);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/40 bg-card/60 backdrop-blur-xl backdrop-saturate-150 transition-transform sm:px-4 px-3"
      style={{
        transform: `translateY(${parallax}px)`,
      }}
    >
      {/* Top glass highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/15" />
      {/* Subtle bottom shadow for depth */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-4 bg-gradient-to-b from-foreground/5 to-transparent dark:from-foreground/10" />
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
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="sr-only">Log out</span>
          </Button>
        </TiltCard>
      ) : (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      )}
    </header>
  );
}
