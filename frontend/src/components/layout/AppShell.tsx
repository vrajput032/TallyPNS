import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { EdgeSwipeGuards } from "./EdgeSwipeGuards";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { GlobalBackground } from "@/components/effects/GlobalBackground";
import { ENABLE_3D } from "@/lib/featureFlags";
import { useEdgeSwipe } from "@/hooks/useEdgeSwipe";
import { useIsCompactNav } from "@/hooks/useIsMobile";

export function AppShell() {
  const isCompactNav = useIsCompactNav();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const openLeft = useCallback(() => {
    setRightOpen(false);
    setLeftOpen(true);
  }, []);
  const openRight = useCallback(() => {
    setLeftOpen(false);
    setRightOpen(true);
  }, []);

  useEdgeSwipe({
    enabled: isCompactNav && !leftOpen && !rightOpen,
    onSwipeFromLeft: openLeft,
    onSwipeFromRight: openRight,
  });

  return (
    <div className="relative flex min-h-screen overscroll-x-none">
      {ENABLE_3D && <GlobalBackground />}
      {isCompactNav ? <EdgeSwipeGuards className="print:hidden" /> : null}
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <Topbar
            leftOpen={leftOpen}
            onLeftOpenChange={setLeftOpen}
            rightOpen={rightOpen}
            onRightOpenChange={setRightOpen}
          />
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
