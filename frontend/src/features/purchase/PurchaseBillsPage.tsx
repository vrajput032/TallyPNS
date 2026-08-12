import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { Button } from "@/components/ui/button";
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
import { formatInr } from "@/lib/formatInr";

function billPieces(bill: PurchaseBill) {
  return bill.items.reduce((sum, item) => sum + Number(item.quantity), 0);
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

const columns: ColumnDef<PurchaseBill>[] = [
  {
    accessorKey: "billNo",
    header: ({ column }) => <SortableHeader label="Bill No." sorted={column.getIsSorted()} />,
  },
  {
    accessorKey: "billDate",
    header: ({ column }) => <SortableHeader label="Date" sorted={column.getIsSorted()} />,
    cell: ({ row }) => new Date(row.original.billDate).toLocaleDateString("en-GB"),
  },
  {
    id: "vendor",
    header: "Vendor",
    cell: ({ row }) => row.original.vendor.name,
  },
  {
    id: "pieces",
    accessorFn: (bill) => billPieces(bill),
    header: ({ column }) => <SortableHeader label="Qty" sorted={column.getIsSorted()} />,
    cell: ({ row }) => billPieces(row.original).toLocaleString("en-IN"),
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(row.original)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
