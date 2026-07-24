import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { useStock, useStockMovements } from "./useInventory";
import type { StockMovement, StockRow } from "./types";

const LOW_STOCK_THRESHOLD = 10;

const stockColumns: ColumnDef<StockRow>[] = [
  { accessorKey: "name", header: "Product" },
  { accessorKey: "hsn", header: "HSN" },
  { accessorKey: "unit", header: "Unit" },
  {
    accessorKey: "currentStock",
    header: "Current Stock",
    cell: ({ row }) => {
      const stock = Number(row.original.currentStock);
      return (
        <span className="flex items-center gap-2">
          {stock.toFixed(2)}
          {stock <= LOW_STOCK_THRESHOLD && <Badge variant="destructive">Low</Badge>}
        </span>
      );
    },
  },
  {
    id: "stockValue",
    header: "Stock Value",
    cell: ({ row }) =>
      (Number(row.original.price) * Number(row.original.currentStock)).toFixed(2),
  },
];

const movementTypeVariant: Record<StockMovement["type"], "default" | "secondary" | "outline"> = {
  IN: "default",
  OUT: "secondary",
  ADJUSTMENT: "outline",
};

const movementColumns: ColumnDef<StockMovement>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("en-GB"),
  },
  { id: "product", header: "Product", cell: ({ row }) => row.original.product.name },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant={movementTypeVariant[row.original.type]}>{row.original.type}</Badge>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => Number(row.original.quantity).toFixed(2),
  },
  { accessorKey: "reason", header: "Reason" },
];

export function InventoryPage() {
  const { data: stock, isLoading: stockLoading } = useStock();
  const { data: movements, isLoading: movementsLoading } = useStockMovements();
  const [dialogOpen, setDialogOpen] = useState(false);

  const stockTable = useReactTable({
    data: stock ?? [],
    columns: stockColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const movementsTable = useReactTable({
    data: movements ?? [],
    columns: movementColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Inventory"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Stock Adjustment
          </Button>
        }
      />

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="history">Stock History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="min-w-0 rounded-md border bg-card">
            <Table>
              <TableHeader>
                {stockTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {stockLoading ? (
                  <TableRow>
                    <TableCell colSpan={stockColumns.length} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : stockTable.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={stockColumns.length} className="text-center text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockTable.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="min-w-0 rounded-md border bg-card">
            <Table>
              <TableHeader>
                {movementsTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {movementsLoading ? (
                  <TableRow>
                    <TableCell colSpan={movementColumns.length} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : movementsTable.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={movementColumns.length} className="text-center text-muted-foreground">
                      No stock movements yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  movementsTable.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <StockAdjustmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
