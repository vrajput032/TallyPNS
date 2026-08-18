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
import { VendorFormDialog } from "./VendorFormDialog";
import { useDeleteVendor, useVendors } from "./useVendors";
import type { Vendor } from "./types";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

const columns: ColumnDef<Vendor>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "phone", header: "Phone" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "gstin", header: "GSTIN" },
  {
    accessorKey: "openingBalance",
    header: "Opening Balance",
    cell: ({ row }) => Number(row.original.openingBalance).toFixed(2),
  },
];

export function VendorsPage() {
  const { data: vendors, isLoading } = useVendors();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteVendor = useDeleteVendor();
  const [globalFilter, setGlobalFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const table = useReactTable({
    data: vendors ?? [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function handleCreate() {
    setEditingVendor(null);
    setDialogOpen(true);
  }

  function handleEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setDialogOpen(true);
  }

  function handleDelete(vendor: Vendor) {
    if (!confirm(`Delete vendor "${vendor.name}"?`)) return;
    deleteVendor.mutate(vendor.id, {
      onSuccess: () => toast.success("Vendor deleted"),
      onError: () => toast.error("Failed to delete vendor"),
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Vendors"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            New Vendor
          </Button>
        }
      />

      <Input
        placeholder="Search vendors..."
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
                  No vendors found.
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

      <VendorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} vendor={editingVendor} />
    </div>
  );
}
