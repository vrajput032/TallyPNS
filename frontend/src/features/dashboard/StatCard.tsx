import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ENABLE_3D } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/lib/useTilt.tsx";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  isLoading: boolean;
  valueClassName?: string;
}

export function StatCard({ label, value, icon: Icon, isLoading, valueClassName }: StatCardProps) {
  const card = (
    <Card
      className={cn(
        "group relative min-w-0 overflow-hidden border-border/40 bg-card/60 backdrop-blur-xl transition-all duration-300",
        "shadow-[0_4px_30px_rgba(0,0,0,0.04)] hover:border-primary/40 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08),0_0_0_1px_rgba(var(--primary),0.15)]",
        "dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(var(--primary),0.3)]",
      )}
    >
      {/* iOS glass refraction shimmer */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] bg-gradient-to-br from-white/20 via-transparent to-transparent dark:from-white/5" />
      </div>
      {/* Top inner highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />

      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={cn("truncate text-lg font-semibold tabular-nums sm:text-2xl", valueClassName)}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!ENABLE_3D) return card;

  return (
    <TiltCard maxTilt={10} scale={1.03} speed={300} className="min-w-0 w-full">
      {card}
    </TiltCard>
  );
}
