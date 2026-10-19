import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ENABLE_3D } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/lib/useTilt.tsx";
import { DashboardSnow } from "./DashboardSnow";
import { DashboardWash, type DashboardTint } from "./DashboardWash";

type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

function snowSeed(label: string) {
  let seed = 0;
  for (let index = 0; index < label.length; index++) {
    seed = (seed + label.charCodeAt(index) * (index + 1)) % 97;
  }
  return seed;
}

const FEATURED_ACCENT: Partial<Record<DashboardTint, { icon: string; line: string; wash: string }>> = {
  crimson: { icon: "bg-[#E11D48]", line: "#E11D48", wash: "from-[#FFF1F2] to-white" },
  navy: { icon: "bg-[#3B82F6]", line: "#3B82F6", wash: "from-[#EFF6FF] to-white" },
  gold: { icon: "bg-[#F5B942]", line: "#E8A317", wash: "from-[#FFF8E8] to-white" },
  mint: { icon: "bg-[#22C55E]", line: "#22C55E", wash: "from-[#F0FDF4] to-white" },
  lilac: { icon: "bg-[#8B5CF6]", line: "#8B5CF6", wash: "from-[#F5F3FF] to-white" },
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-7" />;
  const width = 120;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  const fill = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={fill} fill={color} opacity={0.16} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  isLoading: boolean;
  valueClassName?: string;
  tint?: DashboardTint;
  /** Fortress-card styling (steel / sky-krypton). */
  heroIcon?: boolean;
  /** Colored sales tile with a sparkline, matching the light dashboard row. */
  featured?: boolean;
  /** Short stock tile. */
  compact?: boolean;
  spark?: number[];
  to?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
  valueClassName,
  tint,
  heroIcon = false,
  featured = false,
  spark,
  to,
  compact = false,
}: StatCardProps) {
  const accent = featured && tint ? FEATURED_ACCENT[tint] : undefined;

  if (compact) {
    return (
      <Card className="min-w-0 flex-row items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 shadow-none [--card-spacing:0px]">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
          <Icon className="size-3" />
        </span>
        <CardTitle className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {isLoading ? (
          <Skeleton className="h-4 w-8" />
        ) : (
          <div className={cn("shrink-0 text-sm font-bold tabular-nums text-foreground", valueClassName)}>
            {value}
          </div>
        )}
      </Card>
    );
  }

  if (accent) {
    return (
      <Card className={cn("relative min-w-0 overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-b shadow-[0_8px_20px_rgba(20,60,100,0.08)]", accent.wash)}>
        <div className="flex items-center gap-2 px-3 pt-3">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm", accent.icon)}>
            <Icon className="size-4" />
          </span>
          <CardTitle className="truncate text-sm font-medium text-[#526D8C]">{label}</CardTitle>
        </div>
        <CardContent className="px-3 pb-2.5 pt-2">
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className={cn("truncate text-xl font-bold tabular-nums text-[#15385F]", valueClassName)}>
              {value}
            </div>
          )}
          <div className="relative mt-1 pr-8">
            <Sparkline values={spark ?? []} color={accent.line} />
            {to ? (
              <Link
                to={to}
                aria-label={`Open ${label}`}
                className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border bg-white/80"
                style={{ color: accent.line, borderColor: accent.line }}
              >
                <ChevronRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  const card = (
    <Card
      className={cn(
        "group relative min-w-0 overflow-hidden transition-shadow duration-200",
        heroIcon
          ? compact
            ? "rounded-lg border border-border bg-card shadow-none"
            : "rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(20,60,100,0.07)]"
          : "border-border/40 bg-card/80 backdrop-blur-xl shadow-sm hover:border-primary/40",
      )}
    >
      {heroIcon && !compact ? <DashboardSnow seed={snowSeed(label)} /> : null}
      {!heroIcon && tint ? <DashboardWash tint={tint} /> : null}

      <CardHeader
        className={cn(
          "relative z-[1] flex-row items-center justify-between space-y-0",
          heroIcon ? (compact ? "px-2 pb-0 pt-1.5" : "px-3 pb-1 pt-2.5") : "pb-2 pt-4",
        )}
      >
        <CardTitle className={cn("truncate font-medium text-muted-foreground", compact ? "text-[11px]" : "text-xs sm:text-sm")}>
          {label}
        </CardTitle>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            heroIcon
              ? compact
                ? "size-5 bg-muted text-primary"
                : "size-7 bg-muted text-primary"
              : "size-8 text-muted-foreground group-hover:text-primary",
          )}
        >
          <Icon className={compact ? "size-3" : "size-3.5"} />
        </span>
      </CardHeader>
      <CardContent className={cn("relative z-[1]", heroIcon ? (compact ? "px-2 pb-1.5 pt-0" : "px-3 pb-2.5 pt-0") : "pb-4")}>
        {isLoading ? (
          <Skeleton className="h-6 w-20 sm:h-7" />
        ) : (
          <div
            className={cn(
              "truncate font-bold tabular-nums text-foreground",
              compact ? "text-sm" : heroIcon ? "text-base sm:text-xl" : "text-lg sm:text-2xl",
              valueClassName,
            )}
          >
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!ENABLE_3D || heroIcon) return card;

  return (
    <TiltCard maxTilt={8} scale={1.02} speed={300} className="min-w-0 w-full">
      {card}
    </TiltCard>
  );
}
