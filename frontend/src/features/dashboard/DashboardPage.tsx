import {
  BarChart3,
  Box,
  Boxes,
  ChartNoAxesCombined,
  CreditCard,
  Database,
  TrendingUp,
  Warehouse,
} from "lucide-react";
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
import {
  heroDashboardWash,
  isHeroTheme,
  isSteelTheme,
  useTheme,
  type ThemeName,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { RawMaterialPaymentCard } from "./RawMaterialPaymentCard";
import { StatCard } from "./StatCard";
import { SalesChart } from "./SalesChart";
import { SalesByCustomerChart } from "./SalesByCustomerChart";
import { DashboardSnow } from "./DashboardSnow";
import { DashboardWash, STOCK_TINT } from "./DashboardWash";
import { HERO_FORTRESS, HERO_PORTRAIT } from "./heroAssets";
import { IndusPoCard } from "./IndusPoCard";
import { TradingPnlCard } from "./TradingPnlCard";
import { useDashboardSummary } from "./useDashboardSummary";
import { useMonthlySales } from "./useMonthlySales";

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
        "transition-all duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

function HeroBanner({ themeName }: { themeName: ThemeName }) {
  const navigate = useNavigate();
  const heroMode = isHeroTheme(themeName);
  const steel = isSteelTheme(themeName);

  if (!heroMode) {
    return (
      <div className="relative z-10 flex items-center justify-between gap-2">
        <h1 className="hidden bg-gradient-to-r from-primary via-foreground to-[var(--sidebar-primary)] bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl md:block">
          Dashboard
        </h1>
        <ThemeSelector />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative -mx-3 -mt-[calc(4rem+0.75rem+env(safe-area-inset-top,0px))] flex min-h-48 items-end overflow-hidden pt-[calc(4rem+env(safe-area-inset-top,0px))] sm:-mx-4 sm:-mt-[calc(4rem+1rem+env(safe-area-inset-top,0px))] sm:min-h-52 md:-mt-[calc(4rem+1rem)] md:min-h-[15.5rem] md:pt-16",
        steel
          ? "bg-gradient-to-r from-[#071A2B] via-[#173B57] to-[#d7ebff]"
          : "bg-gradient-to-r from-[#EAF4FF] via-white to-[#d7ebff]",
      )}
    >
      <div className="relative z-[1] flex min-w-0 max-w-[58%] flex-1 flex-col justify-end px-4 pb-4 sm:px-6 sm:pb-5">
        <h1
          className={cn(
            "text-[1.65rem] font-bold tracking-tight sm:text-4xl",
            steel ? "text-[#E7EEF5]" : "text-[#15385F]",
          )}
        >
          Dashboard
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase sm:text-xs">
          <span className="text-[#D91F32]">Red</span>
          <span className={steel ? "text-[#A8B8C9]" : "text-[#526D8C]"}>·</span>
          <span className="text-[#E8B83D]">Gold</span>
          <span className={steel ? "text-[#A8B8C9]" : "text-[#526D8C]"}>·</span>
          <span className="text-[#0756A6]">Steel</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => navigate("/sales")}
            className="hidden h-7 bg-white/85 px-2.5 text-xs sm:inline-flex"
          >
            <ChartNoAxesCombined className="size-3.5" />
            Sales
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => navigate("/inventory")}
            className="hidden h-7 bg-white/85 px-2.5 text-xs sm:inline-flex"
          >
            <Warehouse className="size-3.5" />
            Inventory
          </Button>
          <ThemeSelector />
        </div>
      </div>
      <img
        src={HERO_FORTRESS}
        alt=""
        className="pointer-events-none absolute inset-y-0 right-[26%] hidden h-full w-[46%] object-cover object-left sm:block [mask-image:linear-gradient(90deg,transparent,black_14%,black_70%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,black_14%,black_70%,transparent)]"
      />
      <img
        src={HERO_PORTRAIT}
        alt=""
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-[42%] max-w-80 object-cover object-[center_12%] [mask-image:linear-gradient(90deg,transparent,black_18%)] sm:w-[34%] [-webkit-mask-image:linear-gradient(90deg,transparent,black_18%)]"
      />
    </div>
  );
}

function AnimatedCount({
  target,
  prefix = "",
  suffix = "",
  skipAnimation = false,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  skipAnimation?: boolean;
}) {
  const [display, setDisplay] = useState(() => (skipAnimation ? target : 0));

  useEffect(() => {
    if (skipAnimation) {
      setDisplay(target);
      return;
    }

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
  }, [target, skipAnimation]);

  return (
    <span>
      {prefix}
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

function PanelCard({
  title,
  children,
  heroMode,
}: {
  title: string;
  children: ReactNode;
  heroMode: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative min-w-0 overflow-hidden",
        heroMode
          ? "rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(20,60,100,0.07)]"
          : "border-border/40 bg-card/80 shadow-sm backdrop-blur-xl",
      )}
    >
      {heroMode ? <DashboardSnow seed={title.length} /> : <DashboardWash tint="navy" />}
      {heroMode ? null : (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#D91F32]/70 via-[#E8B83D]/80 to-[#0756A6]/70" />
      )}
      <CardHeader className="relative z-[1] px-3 py-2.5 sm:px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-[1] min-w-0 overflow-hidden px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { theme } = useTheme();
  const heroMode = isHeroTheme(theme.name);
  const { data, isLoading } = useDashboardSummary();
  const { data: monthlySales } = useMonthlySales();
  const pnsSpark = (monthlySales ?? []).map((point) => point.total);
  const tradingSpark = (data?.trading?.months ?? []).map((month) => month.sales);
  const rawSpark = (data?.rawMaterialTrading?.months ?? []).map((month) => month.sales);
  const totalSpark = pnsSpark.map((total, index) => total + (tradingSpark[index] ?? 0) + (rawSpark[index] ?? 0));
  const totalSales = data?.totalSales ?? 0;
  const pnsSales = data?.pnsSales ?? 0;
  const tradingSales = data?.tradingSales ?? 0;
  const rawMaterialSales = data?.rawMaterialTrading?.sales ?? 0;
  const totalReceived = data?.totalReceived ?? 0;
  const stockBySize = data?.stockBySize ?? PIPE_SIZES_MM.map((sizeMm) => ({ sizeMm, quantity: 0 }));
  const skipCountAnimation = data != null;
  const wash = heroDashboardWash(theme.name);

  useEffect(() => {
    document.documentElement.classList.add("hide-scrollbar");
    return () => document.documentElement.classList.remove("hide-scrollbar");
  }, []);

  return (
    <div
      className={cn(
        "relative grid min-w-0 max-w-full overflow-visible",
        heroMode ? "gap-2.5 sm:gap-3" : "gap-4 sm:gap-5",
      )}
    >
      {wash ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-0.75rem] top-[-0.25rem] -z-10 h-[min(55vh,28rem)] rounded-2xl sm:inset-x-[-1rem]"
          style={{ background: wash }}
        />
      ) : null}

      <HeroBanner themeName={theme.name} />

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-5">
        <StatCard
          label="PNS Sales"
          value={<AnimatedCount target={pnsSales} prefix="₹" skipAnimation={skipCountAnimation} />}
          icon={BarChart3}
          isLoading={isLoading}
          tint="crimson"
          heroIcon={heroMode}
          featured={heroMode}
          spark={pnsSpark}
          to="/sales"
        />
        <StatCard
          label="Trading"
          value={<AnimatedCount target={tradingSales} prefix="₹" skipAnimation={skipCountAnimation} />}
          icon={Database}
          isLoading={isLoading}
          tint="navy"
          heroIcon={heroMode}
          featured={heroMode}
          spark={tradingSpark}
          to="/sales"
        />
        <StatCard
          label="Raw material sales"
          value={
            <AnimatedCount target={rawMaterialSales} prefix="₹" skipAnimation={skipCountAnimation} />
          }
          icon={Box}
          isLoading={isLoading}
          tint="gold"
          heroIcon={heroMode}
          featured={heroMode}
          spark={rawSpark}
          to="/raw-material"
        />
        <StatCard
          label="Payment Received"
          value={
            <AnimatedCount target={totalReceived} prefix="₹" skipAnimation={skipCountAnimation} />
          }
          icon={CreditCard}
          isLoading={isLoading}
          tint="mint"
          heroIcon={heroMode}
          featured={heroMode}
          to="/cash"
        />
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <StatCard
            label="Total Sales"
            value={
              <AnimatedCount target={totalSales} prefix="₹" skipAnimation={skipCountAnimation} />
            }
            icon={TrendingUp}
            isLoading={isLoading}
            tint="lilac"
            heroIcon={heroMode}
            featured={heroMode}
            spark={totalSpark}
            to="/sales"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <div className="min-w-0 px-0.5">
          <h2 className="text-sm font-semibold tracking-tight">Current pieces</h2>
          <p className="text-[11px] text-muted-foreground">Pipe stock on hand by size</p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
          {stockBySize.map((row) => (
            <StatCard
              key={row.sizeMm}
              label={formatPipeSize(row.sizeMm)}
              value={
                <AnimatedCount target={Math.round(row.quantity)} skipAnimation={skipCountAnimation} />
              }
              icon={Boxes}
              isLoading={isLoading}
              valueClassName={row.quantity < LOW_STOCK_QTY ? "text-red-600 dark:text-red-400" : undefined}
              tint={row.quantity < LOW_STOCK_QTY ? "rose" : STOCK_TINT[row.sizeMm] ?? "sky"}
              heroIcon={heroMode}
              compact={heroMode}
            />
          ))}
        </div>
      </div>

      <RevealCard className="min-w-0">
        <IndusPoCard data={data?.indusPo} stockBySize={stockBySize} isLoading={isLoading} />
      </RevealCard>

      <div className="grid min-w-0 gap-2.5 lg:grid-cols-2 lg:gap-3">
        <PanelCard title="Sales Overview" heroMode={heroMode}>
          <SalesChart />
        </PanelCard>
        <PanelCard title="Sales by Customer" heroMode={heroMode}>
          <SalesByCustomerChart />
        </PanelCard>
      </div>

      <RevealCard className="min-w-0">
        <TradingPnlCard variant="goods" data={data?.trading} isLoading={isLoading} />
      </RevealCard>

      <RevealCard className="min-w-0">
        <TradingPnlCard variant="raw-material" data={data?.rawMaterialTrading} isLoading={isLoading} />
      </RevealCard>

      <RevealCard className="min-w-0">
        <RawMaterialPaymentCard data={data?.rawMaterial} isLoading={isLoading} />
      </RevealCard>
    </div>
  );
}
