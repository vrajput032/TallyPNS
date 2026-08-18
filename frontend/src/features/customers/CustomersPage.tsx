import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { useCustomers, useDeleteCustomer } from "./useCustomers";
import type { Customer } from "./types";

const columns: ColumnDef<Customer>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "phone", header: "Phone" },
  { accessorKey: "gstin", header: "GSTIN" },
  {
    accessorKey: "totalBilled",
    header: "Total Amount",
    cell: ({ row }) => formatInr(row.original.totalBilled),
  },
  {
    accessorKey: "totalPaid",
    header: "Paid",
    cell: ({ row }) => formatInr(row.original.totalPaid),
  },
  {
    accessorKey: "balanceAmount",
    header: "Balance",
    cell: ({ row }) => (
      <span className={row.original.balanceAmount > 0 ? "font-medium text-destructive" : ""}>
        {formatInr(row.original.balanceAmount)}
      </span>
    ),
  },
];

export function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteCustomer = useDeleteCustomer();
  const [globalFilter, setGlobalFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const table = useReactTable({
    data: customers ?? [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function handleCreate() {
    setEditingCustomer(null);
    setDialogOpen(true);
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setDialogOpen(true);
  }

  function handleDelete(customer: Customer) {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    deleteCustomer.mutate(customer.id, {
      onSuccess: () => toast.success("Customer deleted"),
      onError: () => toast.error("Failed to delete customer"),
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Customers"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            New Customer
          </Button>
        }
      />

      <Input
        placeholder="Search customers..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="w-full max-w-sm"
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
                  No customers found.
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
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                      <Pencil className="size-4" />
                    </Button>
                    {allowDelete ? (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)}>
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

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editingCustomer} />
    </div>
  );
}
