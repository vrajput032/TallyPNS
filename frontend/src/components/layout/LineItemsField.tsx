import { Plus, Trash2 } from "lucide-react";
import { useFormContext, type FieldValues, type Path, type UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/useIsMobile";
import { registerFormNumber } from "@/lib/formNumberInput";
import { formatPipeSize, PIPE_SIZES_MM } from "@/lib/pipeSizes";
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
  const isMobile = useIsMobile();
  const form = useFormContext<TFieldValues>();

  function fieldPath(index: number, key: keyof LineItemValue) {
    return `items.${index}.${key}` as Path<TFieldValues>;
  }

  function setSizeMm(index: number, sizeMm: number) {
    form.setValue(fieldPath(index, "sizeMm"), sizeMm as never, { shouldDirty: true });
  }

  function registerNumber(index: number, key: keyof LineItemValue) {
    return registerFormNumber(register, fieldPath(index, key));
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

      {isMobile ? (
      <div className="grid gap-3">
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
                    <Select
                      value={item?.sizeMm ? String(item.sizeMm) : ""}
                      onValueChange={(value) => setSizeMm(index, Number(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select size">
                          {(value: string | null) =>
                            value ? formatPipeSize(Number(value)) : "Select size"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PIPE_SIZES_MM.map((sizeMm) => (
                          <SelectItem key={sizeMm} value={String(sizeMm)}>
                            {formatPipeSize(sizeMm)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>Qty</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    {...registerNumber(index, "quantity")}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Rate</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    {...registerNumber(index, "rate")}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>GST %</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    {...registerNumber(index, "gstRate")}
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
      ) : (
      <div>
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
                        <Select
                          value={item?.sizeMm ? String(item.sizeMm) : ""}
                          onValueChange={(value) => setSizeMm(index, Number(value))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Size">
                              {(value: string | null) =>
                                value ? formatPipeSize(Number(value)) : "Size"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {PIPE_SIZES_MM.map((sizeMm) => (
                              <SelectItem key={sizeMm} value={String(sizeMm)}>
                                {formatPipeSize(sizeMm)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      {...registerNumber(index, "quantity")}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...registerNumber(index, "rate")}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...registerNumber(index, "gstRate")}
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
      )}

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
