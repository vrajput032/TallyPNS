import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { THEMES, useTheme, type ThemeName } from "@/lib/theme";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent",
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

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-xl">
          <div className="grid grid-cols-1 gap-1">
            {THEMES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => {
                  setTheme(t.name as ThemeName);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                  theme.name === t.name && "bg-accent"
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
                {theme.name === t.name && (
                  <Check className="size-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}