import { Package, TrendingUp, Warehouse } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeSelector } from "@/components/ThemeSelector";
import { formatPipeSize, LOW_STOCK_QTY, PIPE_SIZES_MM } from "@/lib/pipeSizes";
import { cn } from "@/lib/utils";
import { RawMaterialPaymentCard } from "./RawMaterialPaymentCard";
import { StatCard } from "./StatCard";
import { SalesChart } from "./SalesChart";
import { SalesByCustomerChart } from "./SalesByCustomerChart";
import { useDashboardSummary } from "./useDashboardSummary";

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function RevealCard({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useScrollReveal(0.08);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ParallaxHeader() {
  const navigate = useNavigate();
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const applyOffset = () => {
      ticking = false;
      const el = elRef.current;
      if (!el) return;
      const offset = window.scrollY;
      const isH = Math.min(offset / 140, 1);
      el.style.transform = `translateY(${offset * 0.15}px)`;
      el.style.opacity = String(1 - isH * 0.2);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applyOffset);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={elRef}
      className="relative z-10 mb-4 min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/40 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl will-change-transform"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent dark:from-primary/15 dark:via-primary/5" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10"
        style={{ animation: "gradientShift 8s ease-in-out infinite alternate" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent dark:from-white/5" />

      <div className="relative flex flex-col gap-3 px-3 pt-4 pb-4 sm:px-6 sm:pt-7 sm:pb-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-xl font-bold tracking-tight sm:text-2xl">
            Dashboard
          </h1>
          <ThemeSelector />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate("/sales")}
            className="h-10 min-w-0 justify-center backdrop-blur-sm hover:bg-white/10 dark:hover:bg-white/5 sm:h-8"
          >
            <TrendingUp className="size-4" />
            Sales
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate("/inventory")}
            className="h-10 min-w-0 justify-center backdrop-blur-sm hover:bg-white/10 dark:hover:bg-white/5 sm:h-8"
          >
            <Warehouse className="size-4" />
            Inventory
          </Button>
        </div>
      </div>
    </div>
  );
}

function AnimatedCount({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const from = display;
    const to = target;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return (
    <span>
      {prefix}
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();
  const totalSales = data?.totalSales ?? 0;
  const stockBySize = data?.stockBySize ?? PIPE_SIZES_MM.map((sizeMm) => ({ sizeMm, quantity: 0 }));

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden sm:gap-5">
      <ParallaxHeader />
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <StatCard
          label="Total Sales"
          value={
            <AnimatedCount
              target={totalSales}
              prefix="₹"
            />
          }
          icon={TrendingUp}
          isLoading={isLoading}
        />
        {stockBySize.map((row) => (
          <StatCard
            key={row.sizeMm}
            label={formatPipeSize(row.sizeMm)}
            value={<AnimatedCount target={Math.round(row.quantity)} />}
            icon={Package}
            isLoading={isLoading}
            valueClassName={row.quantity < LOW_STOCK_QTY ? "text-red-600" : undefined}
          />
        ))}
      </div>

      <RevealCard className="min-w-0">
        <RawMaterialPaymentCard data={data?.rawMaterial} isLoading={isLoading} />
      </RevealCard>

      <RevealCard className="min-w-0">
        <Card className="relative min-w-0 overflow-hidden border-border/40 bg-card/60 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
          <CardHeader>
            <CardTitle className="text-base font-medium">Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <SalesChart />
          </CardContent>
        </Card>
      </RevealCard>

      <RevealCard className="min-w-0">
        <Card className="relative min-w-0 overflow-hidden border-border/40 bg-card/60 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
          <CardHeader>
            <CardTitle className="text-base font-medium">Sales by Customer</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <SalesByCustomerChart />
          </CardContent>
        </Card>
      </RevealCard>
    </div>
  );
}
