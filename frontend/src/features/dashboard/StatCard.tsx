import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TiltCard } from "@/lib/useTilt.tsx";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  isLoading: boolean;
}

export function StatCard({ label, value, icon: Icon, isLoading }: StatCardProps) {
  return (
    <TiltCard maxTilt={10} scale={1.03} speed={300}>
      <Card className="relative overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold">{value}</div>
          )}
        </CardContent>
      </Card>
    </TiltCard>
  );
}
