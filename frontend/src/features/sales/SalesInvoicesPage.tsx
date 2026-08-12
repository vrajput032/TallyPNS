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
import { useDeleteSalesInvoice, useSalesInvoices } from "./useSales";
import type { SalesInvoice } from "./types";
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import { formatInr } from "@/lib/formatInr";

function invoicePieces(invoice: SalesInvoice) {
  return invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);
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
  const deleteInvoice = useDeleteSalesInvoice();
  const [deleteTarget, setDeleteTarget] = useState<SalesInvoice | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "invoiceDate", desc: true }]);

  const table = useReactTable({
    data: invoices ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const totalPieces = visibleRows.reduce((sum, row) => sum + invoicePieces(row.original), 0);
  const totalAmount = visibleRows.reduce(
    (sum, row) => sum + Number(row.original.totalAmount),
    0
  );

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
                  No invoices found.
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
