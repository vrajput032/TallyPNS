import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName =
  | "royal"
  | "azure"
  | "sky"
  | "night"
  | "forest"
  | "jungle"
  | "clay"
  | "orange"
  | "yellow"
  | "gold"
  | "violet"
  | "lavender"
  | "ocean";

export interface Theme {
  name: ThemeName;
  label: string;
  // CSS token overrides applied to :root
  tokens: Record<string, string>;
  // Preview swatches (4 colors for the UI picker)
  swatches: string[];
}

export const THEMES: Theme[] = [
  {
    name: "royal",
    label: "Royal",
    swatches: ["#1d4ed8", "#8aa8e8", "#faf9f6", "#1a1a1a"],
    tokens: {
      "--primary": "#1d4ed8",
      "--primary-foreground": "#ffffff",
      "--accent": "#dbeafe",
      "--accent-foreground": "#1d4ed8",
      "--background": "#faf9f6",
      "--foreground": "#1a1a1a",
      "--card": "#ffffff",
      "--card-foreground": "#1a1a1a",
      "--muted": "#f0ede4",
      "--muted-foreground": "#78716c",
      "--border": "#e5e0d6",
      "--ring": "#1d4ed8",
      "--sidebar": "#f0ede4",
      "--sidebar-foreground": "#1a1a1a",
      "--sidebar-primary": "#1d4ed8",
      "--sidebar-primary-foreground": "#ffffff",
    },
  },
  {
    name: "azure",
    label: "Azure",
    swatches: ["#2563eb", "#38bdf8", "#f7f4ee", "#0f172a"],
    tokens: {
      "--primary": "#2563eb",
      "--primary-foreground": "#ffffff",
      "--accent": "#dbeafe",
      "--accent-foreground": "#1e40af",
      "--background": "#f7f4ee",
      "--foreground": "#0f172a",
      "--card": "#ffffff",
      "--card-foreground": "#0f172a",
      "--muted": "#ebe4d6",
      "--muted-foreground": "#57534e",
      "--border": "#ddd4c4",
      "--ring": "#2563eb",
      "--sidebar": "#ebe4d6",
      "--sidebar-foreground": "#0f172a",
      "--sidebar-primary": "#2563eb",
      "--sidebar-primary-foreground": "#ffffff",
    },
  },
  {
    name: "sky",
    label: "Sky",
    swatches: ["#0ea5e9", "#bae6fd", "#f0f9ff", "#082f49"],
    tokens: {
      "--primary": "#0ea5e9",
      "--primary-foreground": "#ffffff",
      "--accent": "#e0f2fe",
      "--accent-foreground": "#0369a1",
      "--background": "#f0f9ff",
      "--foreground": "#082f49",
      "--card": "#ffffff",
      "--card-foreground": "#082f49",
      "--muted": "#e0f2fe",
      "--muted-foreground": "#64748b",
      "--border": "#bae6fd",
      "--ring": "#0ea5e9",
      "--sidebar": "#e0f2fe",
      "--sidebar-foreground": "#082f49",
      "--sidebar-primary": "#0ea5e9",
      "--sidebar-primary-foreground": "#ffffff",
    },
  },
  {
    name: "night",
    label: "Night",
    swatches: ["#7dd3fc", "#1e1b2e", "#151b2b", "#0f1115"],
    tokens: {
      "--primary": "#7dd3fc",
      "--primary-foreground": "#0f1115",
      "--accent": "#1e1b2e",
      "--accent-foreground": "#7dd3fc",
      "--background": "#0f1115",
      "--foreground": "#f4f1ea",
      "--card": "#171a21",
      "--card-foreground": "#f4f1ea",
      "--muted": "#1e1b2e",
      "--muted-foreground": "#9ca3af",
      "--border": "#2a2f3a",
      "--ring": "#7dd3fc",
      "--sidebar": "#171a21",
      "--sidebar-foreground": "#f4f1ea",
      "--sidebar-primary": "#7dd3fc",
      "--sidebar-primary-foreground": "#0f1115",
    },
  },
  {
    name: "forest",
    label: "Forest",
    swatches: ["#0f766e", "#b8ddd8", "#f4f1ea", "#1c1917"],
    tokens: {
      "--primary": "#0f766e",
      "--primary-foreground": "#f8faf9",
      "--accent": "#e4efe8",
      "--accent-foreground": "#115e59",
      "--background": "#f4f1ea",
      "--foreground": "#1c1917",
      "--card": "#ffffff",
      "--card-foreground": "#1c1917",
      "--muted": "#e7e0d2",
      "--muted-foreground": "#57534e",
      "--border": "#d6cbb8",
      "--ring": "#0f766e",
      "--sidebar": "#e7e0d2",
      "--sidebar-foreground": "#1c1917",
      "--sidebar-primary": "#0f766e",
      "--sidebar-primary-foreground": "#f8faf9",
    },
  },
  {
    name: "jungle",
    label: "Jungle",
    swatches: ["#166534", "#86efac", "#f0fdf4", "#052e16"],
    tokens: {
      "--primary": "#166534",
      "--primary-foreground": "#ffffff",
      "--accent": "#dcfce7",
      "--accent-foreground": "#14532d",
      "--background": "#f0fdf4",
      "--foreground": "#052e16",
      "--card": "#ffffff",
      "--card-foreground": "#052e16",
      "--muted": "#dcfce7",
      "--muted-foreground": "#166534",
      "--border": "#bbf7d0",
      "--ring": "#166534",
      "--sidebar": "#dcfce7",
      "--sidebar-foreground": "#052e16",
      "--sidebar-primary": "#166534",
      "--sidebar-primary-foreground": "#ffffff",
    },
  },
  {
    name: "clay",
    label: "Clay",
    swatches: ["#c2410c", "#f3d0c0", "#fbf6f1", "#1c1410"],
    tokens: {
      "--primary": "#c2410c",
      "--primary-foreground": "#fff7ed",
      "--accent": "#fde8d8",
      "--accent-foreground": "#9a3412",
      "--background": "#fbf6f1",
      "--foreground": "#1c1410",
      "--card": "#ffffff",
      "--card-foreground": "#1c1410",
      "--muted": "#f1e6db",
      "--muted-foreground": "#78716c",
      "--border": "#e4d5c5",
      "--ring": "#c2410c",
      "--sidebar": "#f1e6db",
      "--sidebar-foreground": "#1c1410",
      "--sidebar-primary": "#c2410c",
      "--sidebar-primary-foreground": "#fff7ed",
    },
  },
  {
    name: "orange",
    label: "Orange",
    swatches: ["#f97316", "#fdba74", "#fff7ed", "#7c2d12"],
    tokens: {
      "--primary": "#f97316",
      "--primary-foreground": "#ffffff",
      "--accent": "#ffedd5",
      "--accent-foreground": "#c2410c",
      "--background": "#fff7ed",
      "--foreground": "#7c2d12",
      "--card": "#ffffff",
      "--card-foreground": "#7c2d12",
      "--muted": "#ffedd5",
      "--muted-foreground": "#9a3412",
      "--border": "#fed7aa",
      "--ring": "#f97316",
      "--sidebar": "#ffedd5",
      "--sidebar-foreground": "#7c2d12",
      "--sidebar-primary": "#f97316",
      "--sidebar-primary-foreground": "#ffffff",
    },
  },
  {
    name: "yellow",
    label: "Yellow",
    swatches: ["#eab308", "#fde047", "#fefce8", "#713f12"],
    tokens: {
      "--primary": "#eab308",
      "--primary-foreground": "#ffffff",
      "--accent": "#fef9c3",
      "--accent-foreground": "#854d0e",
      "--background": "#fefce8",
      "--foreground": "#713f12",
      "--card": "#ffffff",
      "--card-foreground": "#713f12",
      "--muted": "#fef9c3",
      "--muted-foreground": "#854d0e",
      "--border": "#fef08a",
      "--ring": "#eab308",
      "--sidebar": "#fef9c3",
      "--sidebar-foreground": "#713f12",
      "--sidebar-primary": "#eab308",
      "--sidebar-primary-foreground": "#ffffff",
    },
  },
  {
    name: "gold",
    label: "Gold",
    swatches: ["#b45309", "#fbbf24", "#fbf8f1", "#1c1917"],
    tokens: {
      "--primary": "#b45309",
      "--primary-foreground": "#fffbeb",
      "--accent": "#fef3c7",
      "--accent-foreground": "#92400e",
      "--background": "#fbf8f1",
      "--foreground": "#1c1917",
      "--card": "#ffffff",
      "--card-foreground": "#1c1917",
      "--muted": "#f3ead2",
      "--muted-foreground": "#78716c",
      "--border": "#e7d7a8",
      "--ring": "#b45309",
      "--sidebar": "#f3ead2",
      "--sidebar-foreground": "#1c1917",
      "--sidebar-primary": "#b45309",
      "--sidebar-primary-foreground": "#fffbeb",
    },
  },
  {
    name: "violet",
    label: "Violet",
    swatches: ["#6d28d9", "#d4c8f5", "#f6f4fb", "#18181b"],
    tokens: {
      "--primary": "#6d28d9",
      "--primary-foreground": "#faf5ff",
      "--accent": "#ede9fe",
      "--accent-foreground": "#5b21b6",
      "--background": "#f6f4fb",
      "--foreground": "#18181b",
      "--card": "#ffffff",
      "--card-foreground": "#18181b",
      "--muted": "#ebe6f6",
      "--muted-foreground": "#71717a",
      "--border": "#ddd6ef",
      "--ring": "#6d28d9",
      "--sidebar": "#ebe6f6",
      "--sidebar-foreground": "#18181b",
      "--sidebar-primary": "#6d28d9",
      "--sidebar-primary-foreground": "#faf5ff",
    },
  },
  {
    name: "lavender",
    label: "Lavender",
    swatches: ["#7c3aed", "#ddd6fe", "#faf5ff", "#2e1065"],
    tokens: {
      "--primary": "#7c3aed",
      "--primary-foreground": "#ffffff",
      "--accent": "#ede9fe",
      "--accent-foreground": "#6d28d9",
      "--background": "#faf5ff",
      "--foreground": "#2e1065",
      "--card": "#ffffff",
      "--card-foreground": "#2e1065",
      "--muted": "#f3e8ff",
      "--muted-foreground": "#7c3aed",
      "--border": "#ddd6fe",
      "--ring": "#7c3aed",
      "--sidebar": "#f3e8ff",
      "--sidebar-foreground": "#2e1065",
      "--sidebar-primary": "#7c3aed",
      "--sidebar-primary-foreground": "#ffffff",
    },
  },
  {
    name: "ocean",
    label: "Ocean",
    swatches: ["#0e7490", "#b8e4e8", "#f2fbfa", "#042f2e"],
    tokens: {
      "--primary": "#0e7490",
      "--primary-foreground": "#ecfeff",
      "--accent": "#cffafe",
      "--accent-foreground": "#155e75",
      "--background": "#f2fbfa",
      "--foreground": "#042f2e",
      "--card": "#ffffff",
      "--card-foreground": "#042f2e",
      "--muted": "#d9f2ef",
      "--muted-foreground": "#5b7874",
      "--border": "#bfe4df",
      "--ring": "#0e7490",
      "--sidebar": "#d9f2ef",
      "--sidebar-foreground": "#042f2e",
      "--sidebar-primary": "#0e7490",
      "--sidebar-primary-foreground": "#ecfeff",
    },
  },
];

const STORAGE_KEY = "pns-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((t) => t.name === stored)) return stored as ThemeName;
    return "royal";
  });

  const theme = THEMES.find((t) => t.name === themeName)!;

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.tokens)) {
      root.style.setProperty(key, value);
    }
    localStorage.setItem(STORAGE_KEY, themeName);
    window.dispatchEvent(new Event("themechange"));
  }, [theme, themeName]);

  const setTheme = (name: ThemeName) => setThemeName(name);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
