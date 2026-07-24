import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Eye, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
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

const columns: ColumnDef<PurchaseBill>[] = [
  { accessorKey: "billNo", header: "Bill No." },
  {
    accessorKey: "billDate",
    header: "Date",
    cell: ({ row }) => new Date(row.original.billDate).toLocaleDateString("en-GB"),
  },
  {
    id: "vendor",
    header: "Vendor",
    cell: ({ row }) => row.original.vendor.name,
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

  const table = useReactTable({
    data: bills ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function handleDelete(bill: PurchaseBill) {
    if (
      !confirm(`Delete bill ${bill.billNo}? This will reverse the stock added by this bill.`)
    ) {
      return;
    }
    deleteBill.mutate(bill.id, {
      onSuccess: () => toast.success(`Bill ${bill.billNo} deleted`),
      onError: () => toast.error("Failed to delete bill"),
    });
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
    </div>
  );
}
