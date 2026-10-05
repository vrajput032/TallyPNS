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
  ChevronRight,
  Eye,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, TableSkeletonRows } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import {
  PAYMENT_STATUS_LABEL,
  payableTileTone,
  paymentTileClass,
  paymentTileInk,
} from "@/features/payments/paymentTile";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { apiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { MonthlyRunningCostsPanel } from "./MonthlyRunningCostsPanel";
import { useDeletePurchaseBill, usePurchaseBills } from "./usePurchase";
import {
  parsePurchaseSection,
  PURCHASE_SECTIONS,
  purchaseBillTitle,
  purchaseSectionLabel,
  purchaseSectionOf,
  type PurchaseBill,
  type PurchaseSection,
} from "./types";

function newBillLabel(section: PurchaseSection) {
  switch (section) {
    case "EQUIPMENT":
      return "New Bill";
    case "TRADING":
      return "New Trading Bill";
    case "RUNNING_COST":
      return "Add Running Cost";
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
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

function billTitle(bill: PurchaseBill) {
  return purchaseBillTitle(bill);
}

function MobilePurchaseBillCards({
  bills,
  allowDelete,
  onView,
  onEdit,
  onDelete,
}: {
  bills: PurchaseBill[];
  allowDelete: boolean;
  onView: (bill: PurchaseBill) => void;
  onEdit: (bill: PurchaseBill) => void;
  onDelete: (bill: PurchaseBill) => void;
}) {
  if (bills.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">No purchase bills found.</p>
    );
  }

  return (
    <div className="grid gap-3">
      {bills.map((bill) => {
        const balance = bill.balanceAmount ?? 0;
        const status = bill.paymentStatus ?? "PENDING";
        const tone = payableTileTone(status);
        const ink = paymentTileInk(tone);
        const files = bill.attachments ?? [];
        const firstFile = files[0];

        return (
          <div
            key={bill.id}
            onClick={() => onView(bill)}
            className={cn(
              "relative overflow-hidden rounded-3xl border transition-transform active:scale-[0.99]",
              paymentTileClass(tone)
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-10 -top-12 size-36 rounded-full blur-2xl",
                ink.glow
              )}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/25" />

            <div className="relative flex items-start justify-between gap-2 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate font-semibold leading-tight", ink.title)}>
                    {billTitle(bill)}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                      ink.chip
                    )}
                  >
                    {PAYMENT_STATUS_LABEL[status]}
                  </span>
                </div>
                <p className={cn("text-sm", ink.meta)}>
                  {new Date(bill.billDate).toLocaleDateString("en-GB")}
                </p>
                {firstFile ? (
                  <a
                    href={firstFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary underline-offset-2 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paperclip className="size-3 shrink-0" />
                    <span className="truncate">{firstFile.fileName}</span>
                    {files.length > 1 ? ` (+${files.length - 1})` : ""}
                  </a>
                ) : (
                  <p className={cn("mt-1 text-xs", ink.meta)}>No bill file</p>
                )}
              </div>
            </div>

            <div className="relative mx-4 border-t border-black/10 dark:border-white/10" />

            <div className="relative flex items-end justify-between gap-2 p-4">
              <div>
                <p className={cn("text-lg font-bold tabular-nums", ink.title)}>
                  ₹{formatInr(bill.totalAmount)}
                </p>
                <p className={cn("text-xs", ink.meta)}>
                  {balance > 0 ? (
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      ₹{formatInr(balance)} left
                    </span>
                  ) : (
                    "Paid in full"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                {(bill.payments?.length ?? 0) === 0 && (
                  <Button variant="ghost" size="icon" onClick={() => onEdit(bill)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {allowDelete ? (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(bill)}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
                <ChevronRight className={cn("size-4", ink.meta)} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const columns: ColumnDef<PurchaseBill>[] = [
  {
    accessorKey: "billDate",
    header: ({ column }) => <SortableHeader label="Date" sorted={column.getIsSorted()} />,
    cell: ({ row }) => new Date(row.original.billDate).toLocaleDateString("en-GB"),
  },
  {
    id: "title",
    header: "Title",
    cell: ({ row }) => purchaseBillTitle(row.original),
  },
  {
    id: "invoice",
    header: "Invoice",
    cell: ({ row }) => row.original.supplierInvoiceNo?.trim() || "—",
  },
  {
    id: "files",
    header: "Bill file",
    cell: ({ row }) => {
      const files = row.original.attachments ?? [];
      if (files.length === 0) return "—";
      const first = files[0];
      return (
        <a
          href={first.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-[12rem] items-center gap-1 truncate text-primary underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{first.fileName}</span>
          {files.length > 1 ? ` (+${files.length - 1})` : ""}
        </a>
      );
    },
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

export function PurchaseBillsPage() {
  const { data: bills, isLoading } = usePurchaseBills();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = parsePurchaseSection(searchParams.get("tab")) ?? "EQUIPMENT";
  const sectionBills = useMemo(
    () => (bills ?? []).filter((bill) => purchaseSectionOf(bill.kind) === section),
    [bills, section]
  );
  const isMobile = useIsMobile();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteBill = useDeletePurchaseBill();
  const [deleteTarget, setDeleteTarget] = useState<PurchaseBill | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "billDate", desc: true }]);

  const table = useReactTable({
    data: sectionBills,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleBills = table.getRowModel().rows.map((row) => row.original);

  function handleDelete(bill: PurchaseBill) {
    setDeleteTarget(bill);
  }

  function confirmDelete(pin: string) {
    if (!deleteTarget) return;
    deleteBill.mutate(
      { id: deleteTarget.id, pin },
      {
        onSuccess: () => {
          toast.success(`Bill ${deleteTarget.billNo} moved to recycle bin`);
          setDeleteTarget(null);
        },
        onError: (error: unknown) => {
          toast.error(apiErrorMessage(error, "Failed to delete bill"));
        },
      }
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Purchase"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={() => navigate(`/purchase/new?kind=${section}`)}>
            <Plus className="size-4" />
            {newBillLabel(section)}
          </Button>
        }
      />

      <Tabs
        value={section}
        onValueChange={(value) => setSearchParams({ tab: String(value).toLowerCase() })}
      >
        <TabsList className="w-full sm:w-auto">
          {PURCHASE_SECTIONS.map((option) => (
            <TabsTrigger key={option} value={option} className="flex-1 sm:flex-none">
              {purchaseSectionLabel(option)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {section === "RUNNING_COST" ? (
        <>
          <MonthlyRunningCostsPanel />
          <h2 className="px-0.5 pt-2 text-base font-semibold">Running cost entries</h2>
        </>
      ) : null}

      {isLoading ? (
        isMobile ? (
          <CardListSkeleton />
        ) : (
          <div className="min-w-0 rounded-md border bg-card">
            <Table>
              <TableBody>
                <TableSkeletonRows columns={columns.length + 1} />
              </TableBody>
            </Table>
          </div>
        )
      ) : isMobile ? (
        <MobilePurchaseBillCards
          bills={visibleBills}
          allowDelete={allowDelete}
          onView={(bill) => navigate(`/purchase/${bill.id}`)}
          onEdit={(bill) => navigate(`/purchase/${bill.id}/edit`)}
          onDelete={handleDelete}
        />
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
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                    No purchase bills found.
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
                        onClick={() => navigate(`/purchase/${row.original.id}`)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {(row.original.payments?.length ?? 0) === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/purchase/${row.original.id}/edit`)}
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
          </Table>
        </div>
      )}

      <ConfirmDeletePinDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Move bill ${deleteTarget.billNo} to recycle bin?` : "Move to recycle bin?"}
        description="The bill will be removed from Purchase and can be restored from Recycle Bin. Enter the deletion PIN to confirm."
        isPending={deleteBill.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
