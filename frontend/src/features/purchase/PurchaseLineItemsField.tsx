import { Plus, Trash2 } from "lucide-react";
import type { FieldValues, Path, UseFormRegister, UseFormSetValue } from "react-hook-form";
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

export const KG_PER_TON = 1000;

export interface PurchaseLineItemOption {
  id: string;
  name: string;
  unit?: string;
}

export interface PurchaseLineItemValue {
  productId: string;
  quantity: number;
  pricePerKg: number;
  rate: number;
  gstRate: number;
}

interface PurchaseLineItemsFieldProps<TFieldValues extends FieldValues> {
  fields: { id: string }[];
  items: PurchaseLineItemValue[];
  products: PurchaseLineItemOption[] | undefined;
  register: UseFormRegister<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  onProductChange: (index: number, productId: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  errorMessage?: string;
}

export function PurchaseLineItemsField<TFieldValues extends FieldValues>({
  fields,
  items,
  products,
  register,
  setValue,
  onProductChange,
  onAdd,
  onRemove,
  errorMessage,
}: PurchaseLineItemsFieldProps<TFieldValues>) {
  function fieldPath(index: number, key: keyof PurchaseLineItemValue) {
    return `items.${index}.${key}` as Path<TFieldValues>;
  }

  function handlePricePerKgChange(index: number, raw: string) {
    const pricePerKg = Number(raw) || 0;
    const rate = Math.round(pricePerKg * KG_PER_TON * 100) / 100;
    setValue(fieldPath(index, "pricePerKg"), pricePerKg as never, { shouldDirty: true });
    setValue(fieldPath(index, "rate"), rate as never, { shouldDirty: true });
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        MS raw material: enter qty in <strong>Tons</strong> and <strong>₹/Kg</strong>. Rate/Ton is
        calculated as Price/Kg × 1,000.
      </p>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add Item
        </Button>
      </div>

      <div className="grid gap-3 sm:hidden">
        {fields.map((field, index) => {
          const item = items[index];
          const qty = Number(item?.quantity) || 0;
          const rate = Number(item?.rate) || 0;
          const gst = Number(item?.gstRate) || 0;
          const base = qty * rate;
          const amount = base + (base * gst) / 100;
          const kg = qty * KG_PER_TON;
          return (
            <div key={field.id} className="grid gap-3 rounded-md border bg-card p-3">
              <div className="grid gap-1.5">
                <Label>Material</Label>
                <Select
                  value={item?.productId ?? ""}
                  onValueChange={(value) => {
                    if (value) onProductChange(index, value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select material">
                      {(value: string | null) =>
                        products?.find((product) => product.id === value)?.name ??
                        "Select material"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                        {product.unit ? ` (${product.unit})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Qty (Tons)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    {...register(fieldPath(index, "quantity"), { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">= {kg.toFixed(0)} Kg</p>
                </div>
                <div className="grid gap-1.5">
                  <Label>Price / Kg (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item?.pricePerKg ?? 0}
                    onChange={(e) => handlePricePerKgChange(index, e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Rate / Ton (₹)</Label>
                  <Input type="number" step="0.01" readOnly value={item?.rate ?? 0} />
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
                <span className="text-sm font-medium">Amount: {amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              <TableHead>Material</TableHead>
              <TableHead className="w-28">Qty (Tons)</TableHead>
              <TableHead className="w-28">Price/Kg (₹)</TableHead>
              <TableHead className="w-28">Rate/Ton (₹)</TableHead>
              <TableHead className="w-24">GST %</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const item = items[index];
              const qty = Number(item?.quantity) || 0;
              const rate = Number(item?.rate) || 0;
              const gst = Number(item?.gstRate) || 0;
              const base = qty * rate;
              const amount = base + (base * gst) / 100;
              const kg = qty * KG_PER_TON;
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
                        <SelectValue placeholder="Select material">
                          {(value: string | null) =>
                            products?.find((product) => product.id === value)?.name ??
                            "Select material"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                            {product.unit ? ` (${product.unit})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fieldPath(index, "quantity"), { valueAsNumber: true })}
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{kg.toFixed(0)} Kg</p>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item?.pricePerKg ?? 0}
                      onChange={(e) => handlePricePerKgChange(index, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" readOnly value={item?.rate ?? 0} />
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
