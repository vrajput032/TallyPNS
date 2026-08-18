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
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductFormDialog } from "./ProductFormDialog";
import { useDeleteProduct, useProducts } from "./useProducts";
import type { Product } from "./types";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

const columns: ColumnDef<Product>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "hsn", header: "HSN" },
  { accessorKey: "unit", header: "Unit" },
  {
    accessorKey: "gstRate",
    header: "GST %",
    cell: ({ row }) => `${Number(row.original.gstRate).toFixed(2)}%`,
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => Number(row.original.price).toFixed(2),
  },
  {
    accessorKey: "currentStock",
    header: "Current Stock",
    cell: ({ row }) => Number(row.original.currentStock).toFixed(2),
  },
];

export function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteProduct = useDeleteProduct();
  const [globalFilter, setGlobalFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const table = useReactTable({
    data: products ?? [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function handleCreate() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  function handleDelete(product: Product) {
    if (!confirm(`Delete product "${product.name}"?`)) return;
    deleteProduct.mutate(product.id, {
      onSuccess: () => toast.success("Product deleted"),
      onError: () => toast.error("Failed to delete product"),
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Products"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            New Product
          </Button>
        }
      />

      <Input
        placeholder="Search products..."
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
              <TableSkeletonRows columns={columns.length + 1} />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                  No products found.
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

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} />
    </div>
  );
}
