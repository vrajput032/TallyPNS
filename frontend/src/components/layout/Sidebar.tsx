import { SidebarNav } from "./SidebarNav";

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-card md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto">
      <SidebarNav />
    </aside>
  );
}
