import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/lib/useTilt.tsx";
import { ENABLE_3D } from "@/lib/featureFlags";

type PageHeaderProps = {
  title: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  backTo,
  backLabel = "Back",
  actions,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const right = actions ? (
    <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {backTo ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate(backTo)}
            aria-label={backLabel}
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}
        <h1 className="truncate text-xl font-semibold sm:text-2xl">{title}</h1>
      </div>
      {ENABLE_3D && right ? (
        <TiltCard maxTilt={6} scale={1.02} speed={300}>
          {right}
        </TiltCard>
      ) : (
        right
      )}
    </div>
  );
}
