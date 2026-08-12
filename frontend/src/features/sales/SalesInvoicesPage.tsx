import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Eye, Plus, Trash2 } from "lucide-react";
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

const columns: ColumnDef<SalesInvoice>[] = [
  { accessorKey: "invoiceNo", header: "Invoice No." },
  {
    accessorKey: "invoiceDate",
    header: "Date",
    cell: ({ row }) => new Date(row.original.invoiceDate).toLocaleDateString("en-GB"),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => row.original.customer.name,
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

  const table = useReactTable({
    data: invoices ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
                <TableHead className="w-24 text-right">Actions</TableHead>
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
        title={deleteTarget ? `Move invoice ${deleteTarget.invoiceNo} to recycle bin?` : "Move to recycle bin?"}
        description="The invoice will be removed from Sales and can be restored from Recycle Bin. Enter the deletion PIN to confirm."
        isPending={deleteInvoice.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
