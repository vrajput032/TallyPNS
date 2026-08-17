import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { GlobalBackground } from "@/components/effects/GlobalBackground";

const ENABLE_3D = import.meta.env.VITE_ENABLE_3D === "true";

export function AppShell() {
  return (
    <div className="relative flex min-h-screen">
      {ENABLE_3D && <GlobalBackground />}
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
