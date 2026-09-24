import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormSkeleton } from "@/components/loading/PageSkeletons";
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
import { Textarea } from "@/components/ui/textarea";
import { PurchaseAttachmentsPanel } from "./PurchaseAttachmentsPanel";
import { PurchaseLineItemsField } from "./PurchaseLineItemsField";
import { SupplierBillUploadCard } from "./SupplierBillUploadCard";
import {
  parsePurchaseSection,
  purchaseSectionOf,
  type ParsedSupplierInvoice,
  type PurchaseSection,
} from "./types";
import {
  useCreatePurchaseBill,
  usePurchaseBill,
  useUpdatePurchaseBill,
  useUploadPurchaseAttachment,
} from "./usePurchase";
import { formatInr } from "@/lib/formatInr";
import { apiErrorMessage } from "@/lib/apiError";

const RUNNING_COST_SUGGESTIONS = [
  "Rent",
  "Salary",
  "Electricity",
  "Diesel",
  "Machine maintenance",
  "Transport / kiraya",
  "Tools & consumables",
  "Water",
  "Internet / phone",
];

type SectionCopy = {
  newTitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  titleError: string;
  itemsTitle: string;
  hint: string;
  descriptionPlaceholder: string;
  notesPlaceholder: string;
  defaultGst: number;
};

function sectionCopy(section: PurchaseSection): SectionCopy {
  switch (section) {
    case "EQUIPMENT":
      return {
        newTitle: "New Equipment Bill",
        titleLabel: "Bill title",
        titlePlaceholder: "CNC, Traub, caliper…",
        titleError: "Enter a bill title",
        itemsTitle: "Machines / equipment",
        hint: "Equipment / machines: describe the item (CNC, Traub, etc.), qty, rate, and GST.",
        descriptionPlaceholder: "e.g. CNC / Traub",
        notesPlaceholder: "Serial no., warranty, installation notes…",
        defaultGst: 0,
      };
    case "TRADING":
      return {
        newTitle: "New Trading Purchase",
        titleLabel: "Supplier name",
        titlePlaceholder: "e.g. ARB Tubes Corporation",
        titleError: "Enter the supplier name",
        itemsTitle: "Goods bought for trading",
        hint: "Goods bought to resell as-is: description, qty, rate per unit, and GST. Pipe stock is not changed.",
        descriptionPlaceholder: "e.g. MS pipe 85mm × 25mm",
        notesPlaceholder: "HSN, destination, delivery notes…",
        defaultGst: 18,
      };
    case "RUNNING_COST":
      return {
        newTitle: "New Running Cost",
        titleLabel: "Expense",
        titlePlaceholder: "Rent, diesel, maintenance…",
        titleError: "Enter what the expense is for",
        itemsTitle: "Cost lines",
        hint: "Monthly running cost: describe each charge, qty (usually 1), amount, and GST if any.",
        descriptionPlaceholder: "e.g. September diesel",
        notesPlaceholder: "Paid to, meter reading, period covered…",
        defaultGst: 0,
      };
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a description"),
  quantity: z.coerce.number().positive("Qty must be greater than 0"),
  pricePerKg: z.coerce.number().min(0).optional(),
  rate: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0).max(100),
});

const billFormSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(120),
  billDate: z.string().min(1, "Pick the bill date"),
  supplierInvoiceNo: z.string().trim().max(80).optional(),
  supplierGstin: z.string().trim().max(15).optional(),
  vehicleNo: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one item"),
});

type BillFormValues = z.infer<typeof billFormSchema>;

function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

function emptyItem(gstRate: number) {
  return { description: "", quantity: 1, pricePerKg: 0, rate: 0, gstRate };
}

export function PurchaseBillFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { data: existingBill, isLoading: isLoadingBill } = usePurchaseBill(
    isEditing ? id : undefined
  );
  const section: PurchaseSection = existingBill
    ? purchaseSectionOf(existingBill.kind)
    : (parsePurchaseSection(searchParams.get("kind")) ?? "EQUIPMENT");
  const copy = sectionCopy(section);
  const listPath = `/purchase?tab=${section.toLowerCase()}`;
  const createBill = useCreatePurchaseBill();
  const updateBill = useUpdatePurchaseBill();
  const uploadAttachment = useUploadPurchaseAttachment();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BillFormValues | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      title: "",
      billDate: todayIso(),
      supplierInvoiceNo: "",
      supplierGstin: "",
      vehicleNo: "",
      notes: "",
      items: [emptyItem(copy.defaultGst)],
    },
  });

  useEffect(() => {
    if (!existingBill) return;
    form.reset({
      title: existingBill.title ?? "",
      billDate: existingBill.billDate.slice(0, 10),
      supplierInvoiceNo: existingBill.supplierInvoiceNo ?? "",
      supplierGstin: existingBill.supplierGstin ?? existingBill.vendor?.gstin ?? "",
      vehicleNo: existingBill.vehicleNo ?? "",
      notes: existingBill.notes ?? "",
      items: existingBill.items.map((item) => ({
        description: item.description ?? item.product?.name ?? "",
        quantity: Number(item.quantity),
        pricePerKg: 0,
        rate: Number(item.rate),
        gstRate: Number(item.gstRate),
      })),
    });
  }, [existingBill, form]);

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const grandTotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const gst = Number(item.gstRate) || 0;
    const base = qty * rate;
    return sum + base + (base * gst) / 100;
  }, 0);

  function applyParsedBill(parsed: ParsedSupplierInvoice) {
    const fill = (name: "title" | "supplierInvoiceNo" | "supplierGstin" | "vehicleNo" | "billDate", value: string | null) => {
      if (value) form.setValue(name, value, { shouldDirty: true, shouldValidate: true });
    };
    fill("title", parsed.supplierName);
    fill("supplierInvoiceNo", parsed.supplierInvoiceNo);
    fill("supplierGstin", parsed.supplierGstin);
    fill("vehicleNo", parsed.vehicleNo);
    fill("billDate", parsed.billDate);
    if (parsed.items.length > 0) {
      replace(
        parsed.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          pricePerKg: 0,
          rate: item.rate,
          gstRate: item.gstRate,
        }))
      );
    }
    const details = parsed.items
      .map((item) =>
        [item.hsn ? `HSN ${item.hsn}` : null, item.unit ? `unit ${item.unit}` : null]
          .filter(Boolean)
          .join(", ")
      )
      .filter(Boolean);
    if (details.length > 0 && !form.getValues("notes")?.trim()) {
      form.setValue("notes", details.join("\n"), { shouldDirty: true });
    }
  }

  function buildPayload(values: BillFormValues) {
    return {
      vendorId: null,
      kind: section,
      billDate: values.billDate,
      title: values.title.trim(),
      supplierInvoiceNo: values.supplierInvoiceNo?.trim() || null,
      supplierGstin: values.supplierGstin?.trim() || null,
      vehicleNo: values.vehicleNo?.trim() || null,
      notes: values.notes?.trim() || null,
      items: values.items.map((item) => ({
        productId: null,
        description: item.description.trim(),
        quantity: item.quantity,
        pricePerKg: null,
        rate: item.rate,
        gstRate: item.gstRate,
      })),
    };
  }

  async function uploadPending(billId: string) {
    for (const file of pendingFiles) {
      try {
        await uploadAttachment.mutateAsync({ id: billId, file });
      } catch {
        toast.error(`Bill saved, but failed to upload ${file.name}`);
      }
    }
    setPendingFiles([]);
  }

  function onSubmit(values: BillFormValues) {
    if (isEditing) {
      setPendingValues(values);
      setPinDialogOpen(true);
      return;
    }

    createBill.mutate(buildPayload(values), {
      onSuccess: async (bill) => {
        await uploadPending(bill.id);
        toast.success(`Bill ${bill.billNo} created`);
        navigate(`/purchase/${bill.id}`);
      },
      onError: (error: unknown) => {
        toast.error(apiErrorMessage(error, "Failed to create bill"));
      },
    });
  }

  function confirmEdit(pin: string) {
    if (!id || !pendingValues) return;
    updateBill.mutate(
      { id, pin, input: buildPayload(pendingValues) },
      {
        onSuccess: async (bill) => {
          await uploadPending(bill.id);
          toast.success(`Bill ${bill.billNo} updated`);
          setPinDialogOpen(false);
          setPendingValues(null);
          navigate(`/purchase/${bill.id}`);
        },
        onError: (error: unknown) => {
          toast.error(apiErrorMessage(error, "Failed to update bill"));
        },
      }
    );
  }

  if (isEditing && isLoadingBill) {
    return <FormSkeleton />;
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={isEditing ? `Edit Bill ${existingBill?.billNo ?? ""}` : copy.newTitle}
        backTo={isEditing && id ? `/purchase/${id}` : listPath}
        backLabel={isEditing ? "Back to Bill" : "Back to Purchase"}
      />
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          {section === "TRADING" ? (
            <SupplierBillUploadCard
              onFile={(file) => setPendingFiles((files) => [...files, file])}
              onParsed={applyParsedBill}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Bill details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{copy.titleLabel}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={copy.titlePlaceholder}
                        list={section === "RUNNING_COST" ? "running-cost-suggestions" : undefined}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    {section === "RUNNING_COST" ? (
                      <datalist id="running-cost-suggestions">
                        {RUNNING_COST_SUGGESTIONS.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    ) : null}
                    {form.formState.errors.title ? (
                      <p className="text-sm text-destructive">{copy.titleError}</p>
                    ) : null}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{section === "RUNNING_COST" ? "Date (sets the month)" : "Bill date"}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierInvoiceNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice no. (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Their bill number" {...field} value={field.value ?? ""} />
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
                    <FormLabel>GSTIN (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Seller GST number" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {section === "TRADING" ? (
                <FormField
                  control={form.control}
                  name="vehicleNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle no. (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HP12N8187" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes / details (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={copy.notesPlaceholder}
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.itemsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseLineItemsField
                mode="EQUIPMENT"
                hint={copy.hint}
                descriptionPlaceholder={copy.descriptionPlaceholder}
                fields={fields}
                items={items}
                products={undefined}
                register={form.register}
                setValue={form.setValue}
                onProductChange={() => undefined}
                onAdd={() => append(emptyItem(copy.defaultGst))}
                onRemove={remove}
                errorMessage={form.formState.errors.items?.message}
              />
              <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                <div className="text-lg font-semibold">Grand Total: ₹{formatInr(grandTotal)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments (PDF / image)</CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseAttachmentsPanel
                billId={id ?? "new"}
                attachments={existingBill?.attachments}
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditing && id ? `/purchase/${id}` : listPath)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createBill.isPending || updateBill.isPending || uploadAttachment.isPending
              }
            >
              {createBill.isPending || updateBill.isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Save Bill"}
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDeletePinDialog
        open={pinDialogOpen}
        onOpenChange={(open) => {
          setPinDialogOpen(open);
          if (!open) setPendingValues(null);
        }}
        title="Confirm bill edit"
        description="Enter the PIN to confirm this edit. Pipe stock is not changed."
        confirmLabel="Save Changes"
        confirmVariant="default"
        pinLabel="Edit PIN"
        isPending={updateBill.isPending}
        onConfirm={confirmEdit}
      />
    </div>
  );
}
