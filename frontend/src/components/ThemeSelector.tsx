import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { THEMES, useTheme, type ThemeName } from "@/lib/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ThemeList({
  currentName,
  onSelect,
}: {
  currentName: ThemeName;
  onSelect: (name: ThemeName) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1">
      {THEMES.map((t) => (
        <button
          key={t.name}
          type="button"
          onClick={() => onSelect(t.name)}
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm transition-colors hover:bg-accent",
            currentName === t.name && "bg-accent"
          )}
        >
          <span className="flex shrink-0 items-center">
            {t.swatches.map((color, i) => (
              <span
                key={i}
                className="block h-4 w-4 rounded-full border border-border/60 first:ml-0"
                style={{
                  background: color,
                  marginLeft: i === 0 ? 0 : "-4px",
                  zIndex: 4 - i,
                }}
              />
            ))}
          </span>
          <span className="flex-1 font-medium">{t.label}</span>
          {currentName === t.name && <Check className="size-4 text-primary" />}
        </button>
      ))}
    </div>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  function pickTheme(name: ThemeName) {
    setTheme(name);
    setOpen(false);
  }

  useEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, isMobile]);

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent sm:gap-2 sm:px-3",
        open && "bg-accent"
      )}
    >
      <span className="flex items-center gap-0.5">
        {theme.swatches.map((color, i) => (
          <span
            key={i}
            className="block h-3 w-3 rounded-full border border-border/50 first:ml-0"
            style={{ background: color, marginLeft: i === 0 ? 0 : "-3px" }}
          />
        ))}
      </span>
      <Palette className="size-3.5 text-muted-foreground" />
      <span className="hidden sm:inline">{theme.label}</span>
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[80vh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader>
              <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              <SheetTitle>Theme</SheetTitle>
            </SheetHeader>
            <div className="px-3 pb-4">
              <ThemeList currentName={theme.name} onSelect={pickTheme} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="relative inline-block shrink-0">
      {trigger}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 max-h-[min(24rem,70vh)] w-64 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-xl"
            style={{ top: coords.top, right: coords.right }}
          >
            <ThemeList currentName={theme.name} onSelect={pickTheme} />
          </div>,
          document.body
        )}
    </div>
  );
}
