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
  Download,
  Eye,
  FileText,
  MessageSquarePlus,
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
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsCompactNav, useIsMobile } from "@/hooks/useIsMobile";
import { SalesInvoiceChatSheet } from "./SalesInvoiceChatSheet";
import {
  isInMonth,
  monthInputValue,
  monthLabel,
  parseMonthInput,
} from "./salesMonthUtils";
import { useDeleteSalesInvoice, useSalesInvoices } from "./useSales";
import { daysUntilDue, invoicePieces, type SalesInvoice } from "./types";
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const SORT_OPTIONS: { value: string; label: string; id: string; desc: boolean }[] = [
  { value: "date-desc", label: "Date (newest first)", id: "invoiceDate", desc: true },
  { value: "date-asc", label: "Date (oldest first)", id: "invoiceDate", desc: false },
  { value: "invoiceNo-desc", label: "Invoice No. (high to low)", id: "invoiceNo", desc: true },
  { value: "invoiceNo-asc", label: "Invoice No. (low to high)", id: "invoiceNo", desc: false },
  { value: "pieces-desc", label: "Pieces (high to low)", id: "pieces", desc: true },
  { value: "pieces-asc", label: "Pieces (low to high)", id: "pieces", desc: false },
];

function DueStatus({ invoice }: { invoice: SalesInvoice }) {
  const balance = invoice.balanceAmount ?? 0;
  const days = daysUntilDue(invoice);
  if (balance <= 0 || days === null) return null;

  if (days < 0) {
    return (
      <span className="font-medium text-red-600">{Math.abs(days)} days overdue</span>
    );
  }
  if (days === 0) {
    return <span className="font-medium text-amber-600">Due today</span>;
  }
  return (
    <span className={days <= 7 ? "font-medium text-amber-600" : "text-muted-foreground"}>
      {days} days left
    </span>
  );
}

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
    id: "due",
    header: "Due",
    cell: ({ row }) => <DueStatus invoice={row.original} />,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <PaymentStatusBadge status={row.original.paymentStatus ?? "PENDING"} />
    ),
  },
];

export function SalesInvoicesPage() {
  const { data: invoices, isLoading } = useSalesInvoices();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isCompactNav = useIsCompactNav();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteInvoice = useDeleteSalesInvoice();
  const [chatOpen, setChatOpen] = useState(false);
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

  function openMonthDownload() {
    navigate(`/sales/print-month?year=${year}&month=${month}`);
  }

  function openTotalsPdf() {
    if (viewMode === "all") {
      navigate("/sales/print-totals?view=all");
      return;
    }
    navigate(`/sales/print-totals?year=${year}&month=${month}`);
  }

  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader
        title="Sales"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <>
            <Button variant="outline" onClick={() => setChatOpen(true)}>
              <MessageSquarePlus className="size-4" />
              Quick bill
            </Button>
            <Button onClick={() => navigate("/sales/new")}>
              <Plus className="size-4" />
              New Invoice
            </Button>
          </>
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openTotalsPdf}
              aria-label="Download sales PDF"
              disabled={visibleRows.length === 0}
            >
              <FileText className="size-4" />
            </Button>
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={openMonthDownload}
                aria-label="Download month bills"
                disabled={visibleRows.length === 0}
              >
                <Download className="size-4" />
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openTotalsPdf}
              disabled={visibleRows.length === 0}
            >
              <FileText className="size-4" />
              Download PDF
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openMonthDownload}
                  disabled={visibleRows.length === 0}
                >
                  <Download className="size-4" />
                  Download bills
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

      {isMobile && visibleRows.length > 0 ? (
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
      ) : null}

      <div className={cn("min-w-0 border bg-card", isMobile ? "-mx-4 max-w-[100vw] rounded-none border-x-0" : "rounded-md")}>
        <Table className="min-w-[52rem] text-xs sm:text-sm">
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
                <TableSkeletonRows columns={columns.length + 1} />
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
                  <TableCell colSpan={4} />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      {isMobile ? (
        <p className="text-xs text-muted-foreground">
          Swipe sideways for all columns.
        </p>
      ) : null}

      <ConfirmDeletePinDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Move invoice ${deleteTarget.invoiceNo} to recycle bin?` : "Move to recycle bin?"}
        description="The invoice will be removed from Sales and can be restored from Recycle Bin. Enter the deletion PIN to confirm."
        isPending={deleteInvoice.isPending}
        onConfirm={confirmDelete}
      />

      {isCompactNav ? (
        <Button
          size="icon"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 size-14 rounded-full shadow-lg md:hidden"
          onClick={() => setChatOpen(true)}
          aria-label="Quick bill"
        >
          <MessageSquarePlus className="size-6" />
        </Button>
      ) : null}

      <SalesInvoiceChatSheet open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
