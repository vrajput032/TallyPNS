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
  isManual?: boolean;
  productId?: string;
  description?: string;
  hsn?: string;
  unit?: string;
  sizeMm?: number | null;
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
  onAddManual?: () => void;
  onRemove: (index: number) => void;
  errorMessage?: string;
  /** Show optional Size (mm) column — for sales pipes */
  showSizeMm?: boolean;
  /** Allow free-text / non-stock lines (scraps, construction, electricity) */
  allowManual?: boolean;
}

export function LineItemsField<TFieldValues extends FieldValues>({
  fields,
  items,
  products,
  register,
  onProductChange,
  onAdd,
  onAddManual,
  onRemove,
  errorMessage,
  showSizeMm = false,
  allowManual = false,
}: LineItemsFieldProps<TFieldValues>) {
  function fieldPath(index: number, key: keyof LineItemValue) {
    return `items.${index}.${key}` as Path<TFieldValues>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add Product
        </Button>
        {allowManual && onAddManual && (
          <Button type="button" variant="outline" size="sm" onClick={onAddManual}>
            <Plus className="size-4" />
            Add Manual Item
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:hidden">
        {fields.map((field, index) => {
          const item = items[index];
          const isManual = Boolean(item?.isManual);
          const qty = Number(item?.quantity) || 0;
          const rate = Number(item?.rate) || 0;
          const gst = Number(item?.gstRate) || 0;
          const base = qty * rate;
          const amount = base + (base * gst) / 100;
          return (
            <div key={field.id} className="grid gap-3 rounded-md border bg-card p-3">
              {isManual ? (
                <>
                  <div className="grid gap-1.5">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g. Scraps / Construction / Electricity"
                      {...register(fieldPath(index, "description"))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>HSN/SAC</Label>
                      <Input placeholder="Optional" {...register(fieldPath(index, "hsn"))} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Unit</Label>
                      <Input placeholder="NOS" {...register(fieldPath(index, "unit"))} />
                    </div>
                  </div>
                </>
              ) : (
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
              )}
              <div
                className={`grid gap-3 ${
                  showSizeMm && !isManual ? "grid-cols-2" : "grid-cols-3"
                }`}
              >
                {showSizeMm && !isManual && (
                  <div className="grid gap-1.5">
                    <Label>Size (mm)</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="e.g. 95"
                      {...register(fieldPath(index, "sizeMm"), { valueAsNumber: true })}
                    />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(fieldPath(index, "quantity"), { valueAsNumber: true })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(fieldPath(index, "rate"), { valueAsNumber: true })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>GST %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(fieldPath(index, "gstRate"), { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium">
                  Amount:{" "}
                  {amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
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

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{allowManual ? "Product / Description" : "Product"}</TableHead>
              {showSizeMm && <TableHead className="w-24">Size (mm)</TableHead>}
              {allowManual && <TableHead className="w-28">HSN/SAC</TableHead>}
              {allowManual && <TableHead className="w-20">Unit</TableHead>}
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
              const isManual = Boolean(item?.isManual);
              const qty = Number(item?.quantity) || 0;
              const rate = Number(item?.rate) || 0;
              const gst = Number(item?.gstRate) || 0;
              const base = qty * rate;
              const amount = base + (base * gst) / 100;
              return (
                <TableRow key={field.id}>
                  <TableCell>
                    {isManual ? (
                      <Input
                        placeholder="e.g. Scraps / Construction / Electricity"
                        {...register(fieldPath(index, "description"))}
                      />
                    ) : (
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
                    )}
                  </TableCell>
                  {showSizeMm && (
                    <TableCell>
                      {isManual ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Input
                          type="number"
                          step="1"
                          placeholder="95"
                          {...register(fieldPath(index, "sizeMm"), { valueAsNumber: true })}
                        />
                      )}
                    </TableCell>
                  )}
                  {allowManual && (
                    <TableCell>
                      {isManual ? (
                        <Input placeholder="Optional" {...register(fieldPath(index, "hsn"))} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {allowManual && (
                    <TableCell>
                      {isManual ? (
                        <Input placeholder="NOS" {...register(fieldPath(index, "unit"))} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(fieldPath(index, "quantity"), { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(fieldPath(index, "rate"), { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(fieldPath(index, "gstRate"), { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
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
