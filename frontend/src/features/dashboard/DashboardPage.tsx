import { Package, TrendingUp, Warehouse } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

function RevealCard({ children, className }: { children: React.ReactNode; className?: string }) {
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

function cn(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

function ParallaxHeader() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isH = Math.min(offset / 140, 1);

  return (
    <div
      className="relative z-10 mb-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.04)]"
      style={{
        transform: `translateY(${offset * 0.15}px)`,
        opacity: 1 - isH * 0.2,
      }}
    >
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent dark:from-primary/15 dark:via-primary/5" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10"
        style={{ animation: "gradientShift 8s ease-in-out infinite alternate" }}
      />
      {/* Glass reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent dark:from-white/5" />

      <div className="relative flex flex-col gap-3 px-4 pt-6 pb-5 sm:px-6 sm:pt-7 sm:pb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-xl font-bold tracking-tight sm:text-2xl">
              Dashboard
            </h1>
            <ThemeSelector />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate("/sales")}
              className="backdrop-blur-sm hover:bg-white/10 dark:hover:bg-white/5"
            >
              <TrendingUp className="size-4" />
              Sales
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate("/inventory")}
              className="backdrop-blur-sm hover:bg-white/10 dark:hover:bg-white/5"
            >
              <Warehouse className="size-4" />
              Inventory
            </Button>
          </div>
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
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardSummary();
  const totalSales = data?.totalSales ?? 0;
  const stockBySize = data?.stockBySize ?? PIPE_SIZES_MM.map((sizeMm) => ({ sizeMm, quantity: 0 }));

  return (
    <div className="grid gap-5">
      <ParallaxHeader />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

      <RevealCard>
        <Card className="relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
          <CardHeader>
            <CardTitle className="text-base font-medium">Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>
      </RevealCard>

      <RevealCard>
        <Card className="relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
          <CardHeader>
            <CardTitle className="text-base font-medium">Sales by Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesByCustomerChart />
          </CardContent>
        </Card>
      </RevealCard>
    </div>
  );
}
