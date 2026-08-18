import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeList } from "@/components/ThemeSelector";
import { useTheme } from "@/lib/theme";
import { useAuthStore } from "@/store/authStore";

function userInitial(name: string | undefined, username: string | undefined): string {
  const source = name?.trim() || username?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

export function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const user = useAuthStore((state) => state.user);
  const { theme, setTheme } = useTheme();
  const roleLabel = user?.role === "ADMIN" ? "Admin" : "Staff";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-4 pr-12">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {userInitial(user?.name, user?.username)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{user?.name || user?.username}</p>
          <p className="truncate text-sm text-muted-foreground">{roleLabel}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Theme
        </p>
        <ThemeList currentName={theme.name} onSelect={setTheme} />
      </div>
      <Separator />
      <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button variant="outline" className="w-full justify-start" onClick={onLogout}>
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
