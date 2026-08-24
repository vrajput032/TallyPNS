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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useDeletePurchaseBill, usePurchaseBills } from "./usePurchase";
import type { PurchaseBill } from "./types";
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

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
  return bill.supplierInvoiceNo?.trim() || bill.billNo;
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
        const accent =
          status === "PAID" ? "bg-emerald-500" : status === "PARTIAL" ? "bg-amber-500" : "bg-red-400";
        const files = bill.attachments ?? [];
        const firstFile = files[0];

        return (
          <div
            key={bill.id}
            onClick={() => onView(bill)}
            className="relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all active:scale-[0.99] active:bg-muted/60"
          >
            <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />

            <div className="flex items-start justify-between gap-2 p-4 pl-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold leading-tight">{billTitle(bill)}</p>
                  <PaymentStatusBadge status={status} />
                </div>
                <p className="text-sm text-muted-foreground">
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
                  <p className="mt-1 text-xs text-muted-foreground">No bill file</p>
                )}
              </div>
            </div>

            <div className="mx-4 border-t" />

            <div className="flex items-end justify-between gap-2 p-4 pl-5">
              <div>
                <p className="text-lg font-bold tabular-nums">₹{formatInr(bill.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {balance > 0 ? (
                    <span className="font-medium text-red-600">₹{formatInr(balance)} left</span>
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
                <ChevronRight className="size-4 text-muted-foreground" />
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
  const isMobile = useIsMobile();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteBill = useDeletePurchaseBill();
  const [deleteTarget, setDeleteTarget] = useState<PurchaseBill | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "billDate", desc: true }]);

  const table = useReactTable({
    data: bills ?? [],
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
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to delete bill";
          toast.error(message);
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
          <Button onClick={() => navigate("/purchase/new")}>
            <Plus className="size-4" />
            New Bill
          </Button>
        }
      />

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
