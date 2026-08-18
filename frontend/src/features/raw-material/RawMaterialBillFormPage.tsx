import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatInr } from "@/lib/formatInr";
import { piecesFromKg } from "@/lib/rawMaterialYield";
import type { ParsedRawMaterialBill } from "./types";
import {
  useCreateRawMaterialBill,
  useParseRawMaterialBill,
  useRawMaterialBill,
  useUpdateRawMaterialBill,
} from "./useRawMaterial";

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description required"),
  hsn: z.string().optional(),
  quantityKg: z.coerce.number().positive("Kg must be greater than 0"),
  ratePerKg: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
});

const billFormSchema = z.object({
  billNo: z.string().trim().min(1, "Invoice number required"),
  supplierName: z.string().trim().min(1, "Supplier required"),
  supplierGstin: z.string().optional(),
  billDate: z.string().min(1),
  vehicleNo: z.string().optional(),
  destination: z.string().optional(),
  taxableAmount: z.coerce.number().min(0),
  cgstAmount: z.coerce.number().min(0),
  sgstAmount: z.coerce.number().min(0),
  igstAmount: z.coerce.number().min(0),
  roundOff: z.coerce.number(),
  totalAmount: z.coerce.number().positive("Total required"),
  notes: z.string().optional(),
  sourceFileName: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one item"),
});

type BillFormValues = z.infer<typeof billFormSchema>;

const emptyItem = {
  description: "STEEL TUBE CDW",
  hsn: "73069090",
  quantityKg: 0,
  ratePerKg: 0,
  amount: 0,
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function errorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  );
}

export function RawMaterialBillFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: existingBill, isLoading: isLoadingBill } = useRawMaterialBill(
    isEditing ? id : undefined
  );
  const createBill = useCreateRawMaterialBill();
  const updateBill = useUpdateRawMaterialBill();
  const parseBill = useParseRawMaterialBill();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BillFormValues | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      billNo: "",
      supplierName: "",
      supplierGstin: "",
      billDate: new Date().toISOString().slice(0, 10),
      vehicleNo: "",
      destination: "",
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      roundOff: 0,
      totalAmount: 0,
      notes: "",
      sourceFileName: "",
      items: [{ ...emptyItem }],
    },
  });

  useEffect(() => {
    if (!existingBill) return;
    form.reset({
      billNo: existingBill.billNo,
      supplierName: existingBill.supplierName,
      supplierGstin: existingBill.supplierGstin ?? "",
      billDate: existingBill.billDate.slice(0, 10),
      vehicleNo: existingBill.vehicleNo ?? "",
      destination: existingBill.destination ?? "",
      taxableAmount: Number(existingBill.taxableAmount),
      cgstAmount: Number(existingBill.cgstAmount),
      sgstAmount: Number(existingBill.sgstAmount),
      igstAmount: Number(existingBill.igstAmount),
      roundOff: Number(existingBill.roundOff),
      totalAmount: Number(existingBill.totalAmount),
      notes: existingBill.notes ?? "",
      sourceFileName: existingBill.sourceFileName ?? "",
      items: existingBill.items.map((item) => ({
        description: item.description,
        hsn: item.hsn ?? "",
        quantityKg: Number(item.quantityKg),
        ratePerKg: Number(item.ratePerKg),
        amount: Number(item.amount),
      })),
    });
  }, [existingBill, form]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const totalKg = items.reduce((sum, item) => sum + (Number(item.quantityKg) || 0), 0);
  const yieldRows = piecesFromKg(totalKg);
  const totalAmount = Number(form.watch("totalAmount")) || 0;

  function recalcFromItems() {
    const current = form.getValues("items").map((item) => {
      const quantityKg = Number(item.quantityKg) || 0;
      const ratePerKg = Number(item.ratePerKg) || 0;
      return { ...item, amount: money(quantityKg * ratePerKg) };
    });
    current.forEach((item, index) => {
      form.setValue(`items.${index}.amount`, item.amount, { shouldDirty: true });
    });
    const taxable = money(current.reduce((sum, item) => sum + item.amount, 0));
    const cgst = money(taxable * 0.09);
    const sgst = money(taxable * 0.09);
    const roundOff = Number(form.getValues("roundOff")) || 0;
    const igst = Number(form.getValues("igstAmount")) || 0;
    form.setValue("taxableAmount", taxable);
    form.setValue("cgstAmount", cgst);
    form.setValue("sgstAmount", sgst);
    form.setValue("totalAmount", money(taxable + cgst + sgst + igst + roundOff));
  }

  function applyParsed(parsed: ParsedRawMaterialBill) {
    const parsedItems =
      parsed.items.length > 0
        ? parsed.items.map((item) => ({
            description: item.description,
            hsn: item.hsn ?? "",
            quantityKg: item.quantityKg,
            ratePerKg: item.ratePerKg,
            amount: item.amount ?? money(item.quantityKg * item.ratePerKg),
          }))
        : [{ ...emptyItem }];
    form.reset({
      billNo: parsed.billNo ?? "",
      supplierName: parsed.supplierName ?? "",
      supplierGstin: parsed.supplierGstin ?? "",
      billDate: parsed.billDate ?? new Date().toISOString().slice(0, 10),
      vehicleNo: parsed.vehicleNo ?? "",
      destination: parsed.destination ?? "",
      taxableAmount: parsed.taxableAmount ?? 0,
      cgstAmount: parsed.cgstAmount ?? 0,
      sgstAmount: parsed.sgstAmount ?? 0,
      igstAmount: parsed.igstAmount ?? 0,
      roundOff: parsed.roundOff ?? 0,
      totalAmount: parsed.totalAmount ?? 0,
      notes: "",
      sourceFileName: parsed.sourceFileName ?? "",
      items: parsedItems,
    });
    setParseWarnings(parsed.warnings);
    if (parsed.warnings.length > 0) {
      toast.message("Bill read with some missing fields", {
        description: parsed.warnings.join(". "),
      });
    } else {
      toast.success("Bill details filled from PDF — check and save");
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = await parseBill.mutateAsync(file);
      applyParsed(parsed);
    } catch (error) {
      toast.error(errorMessage(error, "Could not read this PDF"));
    }
  }

  function toInput(values: BillFormValues) {
    return {
      billNo: values.billNo,
      supplierName: values.supplierName,
      supplierGstin: values.supplierGstin || null,
      billDate: values.billDate,
      vehicleNo: values.vehicleNo || null,
      destination: values.destination || null,
      taxableAmount: values.taxableAmount,
      cgstAmount: values.cgstAmount,
      sgstAmount: values.sgstAmount,
      igstAmount: values.igstAmount,
      roundOff: values.roundOff,
      totalAmount: values.totalAmount,
      notes: values.notes || null,
      sourceFileName: values.sourceFileName || null,
      items: values.items.map((item) => ({
        description: item.description,
        hsn: item.hsn || null,
        quantityKg: item.quantityKg,
        ratePerKg: item.ratePerKg,
        amount: item.amount,
      })),
    };
  }

  function onSubmit(values: BillFormValues) {
    if (isEditing) {
      setPendingValues(values);
      setPinDialogOpen(true);
      return;
    }
    createBill.mutate(toInput(values), {
      onSuccess: (bill) => {
        toast.success(`Bill ${bill.billNo} saved`);
        navigate(`/raw-material/${bill.id}`);
      },
      onError: (error) => toast.error(errorMessage(error, "Failed to save bill")),
    });
  }

  function confirmEdit(pin: string) {
    if (!id || !pendingValues) return;
    updateBill.mutate(
      { id, pin, input: toInput(pendingValues) },
      {
        onSuccess: (bill) => {
          toast.success(`Bill ${bill.billNo} updated`);
          setPinDialogOpen(false);
          navigate(`/raw-material/${bill.id}`);
        },
        onError: (error) => toast.error(errorMessage(error, "Failed to update bill")),
      }
    );
  }

  if (isEditing && isLoadingBill) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={isEditing ? "Edit raw material bill" : "Add raw material bill"}
        backTo="/raw-material"
        backLabel="Back"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload supplier bill (PDF)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Tally tax invoices (like N.V. Auto) are read automatically. You can still correct any
            field before saving.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              void onPickFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={parseBill.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {parseBill.isPending ? "Reading PDF..." : "Choose PDF"}
          </Button>
          {parseWarnings.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
              {parseWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="billNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice no.</FormLabel>
                    <FormControl>
                      <Input placeholder="NVAI/26-27/680" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierGstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier GSTIN</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle no.</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Steel / MS items (kg)</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyItem })}>
                <Plus className="size-4" />
                Add line
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field: itemField }) => (
                      <FormItem className="sm:col-span-4">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...itemField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantityKg`}
                    render={({ field: itemField }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Kg</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.001"
                            {...itemField}
                            onChange={(event) => {
                              itemField.onChange(event);
                              queueMicrotask(recalcFromItems);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.ratePerKg`}
                    render={({ field: itemField }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>₹ / kg</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...itemField}
                            onChange={(event) => {
                              itemField.onChange(event);
                              queueMicrotask(recalcFromItems);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end justify-between gap-2 sm:col-span-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.amount`}
                      render={({ field: itemField }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...itemField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tax & total</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="taxableAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxable</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cgstAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CGST</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sgstAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SGST</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roundOff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round off</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(event) => {
                            field.onChange(event);
                            queueMicrotask(recalcFromItems);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Bill total (to pay)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pieces from this steel</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>
                  Weight:{" "}
                  <span className="font-semibold tabular-nums">{totalKg.toLocaleString("en-IN")} kg</span>
                </p>
                {yieldRows.map((row) => (
                  <div key={row.sizeMm} className="flex justify-between rounded-lg bg-muted px-3 py-2">
                    <span>{row.sizeMm}mm pipe</span>
                    <span className="font-semibold tabular-nums">
                      {row.pieces.toLocaleString("en-IN")} pcs
                    </span>
                  </div>
                ))}
                <p className="pt-2 text-base font-semibold tabular-nums">
                  Total payable ₹{formatInr(totalAmount)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={createBill.isPending || updateBill.isPending}>
              {createBill.isPending || updateBill.isPending ? "Saving..." : "Save bill"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/raw-material")}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDeletePinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        title="Confirm edit"
        description="Enter the deletion PIN to save changes to this bill."
        confirmLabel="Save"
        confirmVariant="default"
        isPending={updateBill.isPending}
        onConfirm={confirmEdit}
      />
    </div>
  );
}
