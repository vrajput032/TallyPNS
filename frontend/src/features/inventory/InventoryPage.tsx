import { Package, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { useStock, useStockMovements } from "./useInventory";
import type { StockMovement, StockRow } from "./types";
import { formatPipeSize, LOW_STOCK_QTY, PIPE_SIZES_MM } from "@/lib/pipeSizes";

const LOW_STOCK_THRESHOLD = LOW_STOCK_QTY;
/** Bar fills to 100% at this quantity — purely a visual reference point, not a hard cap. */
const VISUAL_MAX_QTY = 2000;

interface SizeCard {
  sizeMm: number;
  qty: number;
}

function sizeCardsFor(row: StockRow | undefined): SizeCard[] {
  return PIPE_SIZES_MM.map((sizeMm) => ({
    sizeMm,
    qty: Number(row?.sizeStocks?.find((s) => Number(s.sizeMm) === sizeMm)?.quantity ?? 0),
  }));
}

const movementTypeVariant: Record<StockMovement["type"], "default" | "secondary" | "outline"> = {
  IN: "default",
  OUT: "secondary",
  ADJUSTMENT: "outline",
};

function SizeStockCard({
  sizeMm,
  qty,
  unit,
  onTap,
}: {
  sizeMm: number;
  qty: number;
  unit: string;
  onTap: () => void;
}) {
  const isLow = qty < LOW_STOCK_THRESHOLD;
  const fillPercent = Math.max(4, Math.min(100, (qty / VISUAL_MAX_QTY) * 100));

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.98] active:bg-muted"
    >
      <div className="flex items-start justify-between">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-sm font-bold">
          {formatPipeSize(sizeMm)}
        </div>
        {isLow && <Badge variant="destructive">Low</Badge>}
      </div>
      <div>
        <p className={`text-2xl font-bold leading-tight ${isLow ? "text-red-600" : ""}`}>
          {qty.toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-muted-foreground">{unit} in stock</p>
      </div>
      {/* Visual stock-level bar so quantity is readable at a glance, not just as a number. */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${isLow ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </button>
  );
}

function StockView({
  row,
  isLoading,
  search,
  onSearchChange,
  onAdjust,
}: {
  row: StockRow | undefined;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onAdjust: (sizeMm?: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="grid place-items-center gap-2 py-16 text-center text-muted-foreground">
        <Package className="size-8" />
        <p className="text-sm">No products found.</p>
      </div>
    );
  }

  const sizeCards = sizeCardsFor(row);
  const q = search.trim().toLowerCase();
  const visibleCards = q ? sizeCards.filter((s) => formatPipeSize(s.sizeMm).includes(q)) : sizeCards;
  const totalStock = Number(row.currentStock);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search size (e.g. 95mm)..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 pl-9 text-base"
        />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{row.name}</p>
        <p className="text-3xl font-bold leading-tight">
          {totalStock.toLocaleString("en-IN")}
          <span className="ml-1 text-base font-normal text-muted-foreground">{row.unit}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visibleCards.map(({ sizeMm, qty }) => (
          <SizeStockCard
            key={sizeMm}
            sizeMm={sizeMm}
            qty={qty}
            unit={row.unit}
            onTap={() => onAdjust(sizeMm)}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryView({
  movements,
  isLoading,
}: {
  movements: StockMovement[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">No stock movements yet.</p>
    );
  }

  return (
    <div className="grid gap-2">
      {movements.map((m) => {
        const qty = Number(m.quantity);
        const sign = m.type === "OUT" ? "−" : qty >= 0 ? "+" : "−";
        return (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={movementTypeVariant[m.type]}>{m.type}</Badge>
                {m.sizeMm != null && Number(m.sizeMm) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatPipeSize(Number(m.sizeMm))}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{m.reason || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(m.createdAt).toLocaleString("en-GB")}
              </p>
            </div>
            <p
              className={`shrink-0 text-base font-semibold ${
                m.type === "OUT" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {sign}
              {Math.abs(qty).toLocaleString("en-IN")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function InventoryPage() {
  const { data: stock, isLoading: stockLoading } = useStock();
  const { data: movements, isLoading: movementsLoading } = useStockMovements();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<{ productId?: string; sizeMm?: number }>({});
  const [search, setSearch] = useState("");

  const row = useMemo(() => stock?.[0], [stock]);

  function openAdjustment(sizeMm?: number) {
    setAdjustTarget({ productId: row?.id, sizeMm });
    setDialogOpen(true);
  }

  return (
    <div className="relative grid gap-4 pb-24 sm:pb-4">
      <PageHeader
        title="Inventory"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button className="hidden sm:inline-flex" onClick={() => openAdjustment(undefined)}>
            <Plus className="size-4" />
            Stock Adjustment
          </Button>
        }
      />

      <Tabs defaultValue="stock">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="stock" className="flex-1 sm:flex-none">
            Stock
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <StockView
            row={row}
            isLoading={stockLoading}
            search={search}
            onSearchChange={setSearch}
            onAdjust={(sizeMm) => openAdjustment(sizeMm)}
          />
        </TabsContent>

        <TabsContent value="history">
          <HistoryView movements={movements ?? []} isLoading={movementsLoading} />
        </TabsContent>
      </Tabs>

      {/* Floating action button on mobile — native app pattern for the primary create action. */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg sm:hidden"
        onClick={() => openAdjustment(undefined)}
      >
        <Plus className="size-6" />
      </Button>

      <StockAdjustmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialProductId={adjustTarget.productId}
        initialSizeMm={adjustTarget.sizeMm}
      />
    </div>
  );
}
