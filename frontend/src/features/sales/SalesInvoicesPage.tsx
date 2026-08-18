import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDeleteSalesInvoice, useSalesInvoices } from "./useSales";
import type { SalesInvoice } from "./types";
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

function invoicePieces(invoice: SalesInvoice) {
  return invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);
}

function monthInputValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthInput(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function isInMonth(iso: string, year: number, month: number) {
  const date = new Date(iso);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

const SORT_OPTIONS: { value: string; label: string; id: string; desc: boolean }[] = [
  { value: "date-desc", label: "Date (newest first)", id: "invoiceDate", desc: true },
  { value: "date-asc", label: "Date (oldest first)", id: "invoiceDate", desc: false },
  { value: "invoiceNo-desc", label: "Invoice No. (high to low)", id: "invoiceNo", desc: true },
  { value: "invoiceNo-asc", label: "Invoice No. (low to high)", id: "invoiceNo", desc: false },
  { value: "pieces-desc", label: "Pieces (high to low)", id: "pieces", desc: true },
  { value: "pieces-asc", label: "Pieces (low to high)", id: "pieces", desc: false },
];

function SortableHeader({ label, sorted }: { label: string; sorted: false | "asc" | "desc" }) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <span className="inline-flex cursor-pointer select-none items-center gap-1">
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </span>
  );
}

const columns: ColumnDef<SalesInvoice>[] = [
  {
    accessorKey: "invoiceNo",
    header: ({ column }) => (
      <SortableHeader label="Invoice No." sorted={column.getIsSorted()} />
    ),
  },
  {
    accessorKey: "invoiceDate",
    header: ({ column }) => <SortableHeader label="Date" sorted={column.getIsSorted()} />,
    cell: ({ row }) => new Date(row.original.invoiceDate).toLocaleDateString("en-GB"),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => row.original.customer.name,
  },
  {
    id: "pieces",
    accessorFn: (invoice) => invoicePieces(invoice),
    header: ({ column }) => <SortableHeader label="Pieces" sorted={column.getIsSorted()} />,
    cell: ({ row }) => invoicePieces(row.original).toLocaleString("en-IN"),
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => formatInr(row.original.totalAmount),
  },
  {
    id: "balance",
    header: "Balance",
    cell: ({ row }) => formatInr(row.original.balanceAmount ?? 0),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <PaymentStatusBadge status={row.original.paymentStatus ?? "PENDING"} />
    ),
  },
];

function MobileInvoiceCards({
  invoices,
  isLoading,
  emptyMessage,
  onView,
  onEdit,
  onDelete,
}: {
  invoices: SalesInvoice[];
  isLoading: boolean;
  emptyMessage: string;
  onView: (invoice: SalesInvoice) => void;
  onEdit: (invoice: SalesInvoice) => void;
  onDelete?: (invoice: SalesInvoice) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-3">
      {invoices.map((invoice) => {
        const balance = invoice.balanceAmount ?? 0;
        const status = invoice.paymentStatus ?? "PENDING";
        const accent =
          status === "PAID" ? "bg-emerald-500" : status === "PARTIAL" ? "bg-amber-500" : "bg-red-400";
        const initial = invoice.customer.name.trim().charAt(0).toUpperCase() || "?";

        return (
          <div
            key={invoice.id}
            onClick={() => onView(invoice)}
            className="relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all active:scale-[0.99] active:bg-muted/60"
          >
            {/* Status accent bar */}
            <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />

            <div className="flex items-center gap-3 p-4 pl-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold leading-tight">{invoice.invoiceNo}</p>
                  <PaymentStatusBadge status={status} />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {invoice.customer.name}
                </p>
              </div>
            </div>

            <div className="mx-4 border-t" />

            <div className="flex items-center justify-between gap-2 p-4 pl-5">
              <div className="flex items-center gap-3">
                {/* Pieces called out as its own stat pill, not buried in text. */}
                <div className="flex flex-col items-center rounded-xl bg-muted px-3 py-1.5">
                  <span className="text-base font-bold leading-none tabular-nums">
                    {invoicePieces(invoice).toLocaleString("en-IN")}
                  </span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Pcs
                  </span>
                </div>
                <div>
                  <p className="text-lg font-bold leading-tight tabular-nums">
                    ₹{formatInr(invoice.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(invoice.invoiceDate).toLocaleDateString("en-GB")}
                    {balance > 0 && (
                      <span className="font-medium text-red-600">
                        {" "}
                        · ₹{formatInr(balance)} due
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div
                className="flex shrink-0 items-center"
                onClick={(e) => e.stopPropagation()}
              >
                {(invoice.receipts?.length ?? 0) === 0 && (
                  <Button variant="ghost" size="icon" onClick={() => onEdit(invoice)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {onDelete ? (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(invoice)}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SalesInvoicesPage() {
  const { data: invoices, isLoading } = useSalesInvoices();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteInvoice = useDeleteSalesInvoice();
  const [deleteTarget, setDeleteTarget] = useState<SalesInvoice | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "invoiceDate", desc: true }]);
  const now = new Date();
  const [viewMode, setViewMode] = useState<"month" | "all">("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const filteredInvoices = useMemo(() => {
    const list = invoices ?? [];
    if (viewMode === "all") return list;
    return list.filter((invoice) => isInMonth(invoice.invoiceDate, year, month));
  }, [invoices, viewMode, year, month]);

  const table = useReactTable({
    data: filteredInvoices,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const currentSortValue =
    SORT_OPTIONS.find((o) => o.id === sorting[0]?.id && o.desc === sorting[0]?.desc)?.value ??
    "date-desc";

  function applySort(value: string) {
    const option = SORT_OPTIONS.find((o) => o.value === value);
    if (option) setSorting([{ id: option.id, desc: option.desc }]);
  }

  const visibleRows = table.getRowModel().rows;
  const totalPieces = visibleRows.reduce((sum, row) => sum + invoicePieces(row.original), 0);
  const totalAmount = visibleRows.reduce(
    (sum, row) => sum + Number(row.original.totalAmount),
    0
  );

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
    setViewMode("month");
  }

  function handleDelete(invoice: SalesInvoice) {
    setDeleteTarget(invoice);
  }

  function confirmDelete(pin: string) {
    if (!deleteTarget) return;
    deleteInvoice.mutate(
      { id: deleteTarget.id, pin },
      {
        onSuccess: () => {
          toast.success(`Invoice ${deleteTarget.invoiceNo} moved to recycle bin`);
          setDeleteTarget(null);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to delete invoice";
          toast.error(message);
        },
      }
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Sales"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={() => navigate("/sales/new")}>
            <Plus className="size-4" />
            New Invoice
          </Button>
        }
      />

      {isMobile ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            {/* Native-style segmented control */}
            <div className="flex flex-1 rounded-lg border bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "month" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "all" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                All
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" size="icon" aria-label="Sort">
                    <ArrowUpDown className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={currentSortValue} onValueChange={applySort}>
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {viewMode === "month" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Input
                type="month"
                className="h-9 flex-1 text-center"
                value={monthInputValue(year, month)}
                onChange={(e) => {
                  const parsed = parseMonthInput(e.target.value);
                  if (parsed) {
                    setYear(parsed.year);
                    setMonth(parsed.month);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {viewMode === "month" ? monthLabel(year, month) : "All months"} ·{" "}
            {visibleRows.length} invoice{visibleRows.length === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
            <Button
              type="button"
              variant={viewMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("all")}
            >
              All
            </Button>
            {viewMode === "month" && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
                  Prev
                </Button>
                <Input
                  type="month"
                  className="w-[10.5rem]"
                  value={monthInputValue(year, month)}
                  onChange={(e) => {
                    const parsed = parseMonthInput(e.target.value);
                    if (parsed) {
                      setYear(parsed.year);
                      setMonth(parsed.month);
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>
                  Next
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {viewMode === "month"
              ? `${monthLabel(year, month)} · ${visibleRows.length} invoice${
                  visibleRows.length === 1 ? "" : "s"
                }`
              : `All months · ${visibleRows.length} invoice${visibleRows.length === 1 ? "" : "s"}`}
          </p>
        </div>
      )}

      {isMobile ? (
        <>
          {visibleRows.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border bg-card p-3">
              <div>
                <p className="text-xs text-muted-foreground">Total pieces</p>
                <p className="text-lg font-bold leading-tight">
                  {totalPieces.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total amount</p>
                <p className="text-lg font-bold leading-tight">₹{formatInr(totalAmount)}</p>
              </div>
            </div>
          )}
          <MobileInvoiceCards
            invoices={visibleRows.map((row) => row.original)}
            isLoading={isLoading}
            emptyMessage={
              viewMode === "month"
                ? `No invoices found for ${monthLabel(year, month)}.`
                : "No invoices found."
            }
            onView={(invoice) => navigate(`/sales/${invoice.id}`)}
            onEdit={(invoice) => navigate(`/sales/${invoice.id}/edit`)}
            onDelete={allowDelete ? handleDelete : undefined}
          />
        </>
      ) : (
        <div className="min-w-0 rounded-md border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      onClick={
                        header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                    {viewMode === "month"
                      ? `No invoices found for ${monthLabel(year, month)}.`
                      : "No invoices found."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/sales/${row.original.id}`)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {(row.original.receipts?.length ?? 0) === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/sales/${row.original.id}/edit`)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {allowDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(row.original)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {visibleRows.length > 0 && (
              <tfoot>
                <TableRow className="font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell>{totalPieces.toLocaleString("en-IN")}</TableCell>
                  <TableCell>{formatInr(totalAmount)}</TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      )}

      <ConfirmDeletePinDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Move invoice ${deleteTarget.invoiceNo} to recycle bin?` : "Move to recycle bin?"}
        description="The invoice will be removed from Sales and can be restored from Recycle Bin. Enter the deletion PIN to confirm."
        isPending={deleteInvoice.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
