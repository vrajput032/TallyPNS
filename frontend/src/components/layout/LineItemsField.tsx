import { Plus, Trash2 } from "lucide-react";
import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface LineItemOption {
  id: string;
  name: string;
}

export interface LineItemValue {
  productId: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

interface LineItemsFieldProps<TFieldValues extends FieldValues> {
  fields: { id: string }[];
  items: LineItemValue[];
  products: LineItemOption[] | undefined;
  register: UseFormRegister<TFieldValues>;
  onProductChange: (index: number, productId: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  errorMessage?: string;
}

export function LineItemsField<TFieldValues extends FieldValues>({
  fields,
  items,
  products,
  register,
  onProductChange,
  onAdd,
  onRemove,
  errorMessage,
}: LineItemsFieldProps<TFieldValues>) {
  function fieldPath(index: number, key: keyof LineItemValue) {
    return `items.${index}.${key}` as Path<TFieldValues>;
  }
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add Item
        </Button>
      </div>

      {/* Mobile: stacked cards */}
      <div className="grid gap-3 sm:hidden">
        {fields.map((field, index) => {
          const item = items[index];
          const base = (item?.quantity || 0) * (item?.rate || 0);
          const amount = base + (base * (item?.gstRate || 0)) / 100;
          return (
            <div key={field.id} className="grid gap-3 rounded-md border bg-card p-3">
              <div className="grid gap-1.5">
                <Label>Product</Label>
                <Select
                  value={item?.productId ?? ""}
                  onValueChange={(value) => {
                    if (value) onProductChange(index, value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a product">
                      {(value: string | null) =>
                        products?.find((product) => product.id === value)?.name ??
                        "Select a product"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Qty</Label>
                  <Input type="number" step="0.01" {...register(fieldPath(index, "quantity"))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Rate</Label>
                  <Input type="number" step="0.01" {...register(fieldPath(index, "rate"))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>GST %</Label>
                  <Input type="number" step="0.01" {...register(fieldPath(index, "gstRate"))} />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium">Amount: {amount.toFixed(2)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={fields.length === 1}
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="w-24">Qty</TableHead>
              <TableHead className="w-28">Rate</TableHead>
              <TableHead className="w-24">GST %</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const item = items[index];
              const base = (item?.quantity || 0) * (item?.rate || 0);
              const amount = base + (base * (item?.gstRate || 0)) / 100;
              return (
                <TableRow key={field.id}>
                  <TableCell>
                    <Select
                      value={item?.productId ?? ""}
                      onValueChange={(value) => {
                        if (value) onProductChange(index, value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product">
                          {(value: string | null) =>
                            products?.find((product) => product.id === value)?.name ??
                            "Select a product"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" {...register(fieldPath(index, "quantity"))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" {...register(fieldPath(index, "rate"))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" {...register(fieldPath(index, "gstRate"))} />
                  </TableCell>
                  <TableCell className="text-right">{amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => onRemove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
