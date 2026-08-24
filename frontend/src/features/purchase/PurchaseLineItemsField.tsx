import { Plus, Trash2 } from "lucide-react";
import type { FieldValues, Path, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/useIsMobile";
import { numberInputValue, registerFormNumber } from "@/lib/formNumberInput";
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
  productId?: string;
  description?: string;
  quantity: number;
  pricePerKg?: number;
  rate: number;
  gstRate: number;
}

interface PurchaseLineItemsFieldProps<TFieldValues extends FieldValues> {
  mode?: "CATALOG" | "EQUIPMENT";
  showGst?: boolean;
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
  mode = "CATALOG",
  showGst = true,
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
  const isMobile = useIsMobile();
  const isEquipment = mode === "EQUIPMENT";

  function fieldPath(index: number, key: keyof PurchaseLineItemValue) {
    return `items.${index}.${key}` as Path<TFieldValues>;
  }

  function registerNumber(index: number, key: keyof PurchaseLineItemValue) {
    return registerFormNumber(register, fieldPath(index, key));
  }

  function handlePricePerKgChange(index: number, raw: string) {
    if (raw === "" || raw === "-") {
      setValue(fieldPath(index, "pricePerKg"), undefined as never, { shouldDirty: true });
      setValue(fieldPath(index, "rate"), undefined as never, { shouldDirty: true });
      return;
    }
    const pricePerKg = Number(raw);
    if (Number.isNaN(pricePerKg)) return;
    const rate = Math.round(pricePerKg * KG_PER_TON * 100) / 100;
    setValue(fieldPath(index, "pricePerKg"), pricePerKg as never, { shouldDirty: true });
    setValue(fieldPath(index, "rate"), rate as never, { shouldDirty: true });
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {isEquipment
          ? showGst
            ? "Equipment / machines: describe the item (CNC, Traub, etc.), qty, rate, and GST."
            : "Equipment / machines: describe the item (CNC, Traub, etc.), qty, and rate."
          : (
            <>
              MS raw material: enter qty in <strong>Tons</strong> and <strong>₹/Kg</strong>. Rate/Ton
              is calculated as Price/Kg × 1,000.
            </>
          )}
      </p>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add Item
        </Button>
      </div>

      {isMobile ? (
        <div className="grid gap-3">
          {fields.map((field, index) => {
            const item = items[index];
            const qty = Number(item?.quantity) || 0;
            const rate = Number(item?.rate) || 0;
            const gst = showGst ? Number(item?.gstRate) || 0 : 0;
            const base = qty * rate;
            const amount = base + (base * gst) / 100;
            const kg = qty * KG_PER_TON;
            return (
              <div key={field.id} className="grid gap-3 rounded-md border bg-card p-3">
                {isEquipment ? (
                  <div className="grid gap-1.5">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g. CNC lathe / Traub A25"
                      {...register(fieldPath(index, "description"))}
                    />
                  </div>
                ) : (
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
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>{isEquipment ? "Qty" : "Qty (Tons)"}</Label>
                    <Input type="text" inputMode="decimal" {...registerNumber(index, "quantity")} />
                    {!isEquipment ? (
                      <p className="text-xs text-muted-foreground">= {kg.toFixed(0)} Kg</p>
                    ) : null}
                  </div>
                  {isEquipment ? (
                    <div className="grid gap-1.5">
                      <Label>Rate (₹)</Label>
                      <Input type="text" inputMode="decimal" {...registerNumber(index, "rate")} />
                    </div>
                  ) : (
                    <div className="grid gap-1.5">
                      <Label>Price / Kg (₹)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={numberInputValue(item?.pricePerKg)}
                        onChange={(e) => handlePricePerKgChange(index, e.target.value)}
                      />
                    </div>
                  )}
                  {!isEquipment ? (
                    <div className="grid gap-1.5">
                      <Label>Rate / Ton (₹)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        readOnly
                        value={numberInputValue(item?.rate)}
                      />
                    </div>
                  ) : null}
                  {showGst ? (
                    <div className="grid gap-1.5">
                      <Label>GST %</Label>
                      <Input type="text" inputMode="decimal" {...registerNumber(index, "gstRate")} />
                    </div>
                  ) : null}
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
                <TableHead>{isEquipment ? "Description" : "Material"}</TableHead>
                <TableHead className="w-28">{isEquipment ? "Qty" : "Qty (Tons)"}</TableHead>
                {isEquipment ? (
                  <TableHead className="w-28">Rate (₹)</TableHead>
                ) : (
                  <>
                    <TableHead className="w-28">Price/Kg (₹)</TableHead>
                    <TableHead className="w-28">Rate/Ton (₹)</TableHead>
                  </>
                )}
                {showGst ? <TableHead className="w-24">GST %</TableHead> : null}
                <TableHead className="w-32 text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const item = items[index];
                const qty = Number(item?.quantity) || 0;
                const rate = Number(item?.rate) || 0;
                const gst = showGst ? Number(item?.gstRate) || 0 : 0;
                const base = qty * rate;
                const amount = base + (base * gst) / 100;
                const kg = qty * KG_PER_TON;
                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      {isEquipment ? (
                        <Input
                          placeholder="e.g. CNC / Traub"
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
                      )}
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.001" {...registerNumber(index, "quantity")} />
                      {!isEquipment ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{kg.toFixed(0)} Kg</p>
                      ) : null}
                    </TableCell>
                    {isEquipment ? (
                      <TableCell>
                        <Input type="number" step="0.01" {...registerNumber(index, "rate")} />
                      </TableCell>
                    ) : (
                      <>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={numberInputValue(item?.pricePerKg) || "0"}
                            onChange={(e) => handlePricePerKgChange(index, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" readOnly value={item?.rate ?? 0} />
                        </TableCell>
                      </>
                    )}
                    {showGst ? (
                      <TableCell>
                        <Input type="number" step="0.01" {...registerNumber(index, "gstRate")} />
                      </TableCell>
                    ) : null}
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
