import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  useCreatePurchaseBill,
  usePurchaseBill,
  useUpdatePurchaseBill,
  useUploadPurchaseAttachment,
} from "./usePurchase";
import { formatInr } from "@/lib/formatInr";

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Enter what was purchased (e.g. CNC / Traub)"),
  quantity: z.coerce.number().positive("Qty must be greater than 0"),
  pricePerKg: z.coerce.number().min(0).optional(),
  rate: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0).max(100),
});

const billFormSchema = z.object({
  supplierInvoiceNo: z.string().trim().max(80).optional(),
  supplierGstin: z.string().trim().max(15).optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one item"),
});

type BillFormValues = z.infer<typeof billFormSchema>;

const emptyItem = {
  description: "",
  quantity: 1,
  pricePerKg: 0,
  rate: 0,
  gstRate: 0,
};

export function PurchaseBillFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { data: existingBill, isLoading: isLoadingBill } = usePurchaseBill(
    isEditing ? id : undefined
  );
  const createBill = useCreatePurchaseBill();
  const updateBill = useUpdatePurchaseBill();
  const uploadAttachment = useUploadPurchaseAttachment();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BillFormValues | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      supplierInvoiceNo: "",
      supplierGstin: "",
      notes: "",
      items: [{ ...emptyItem }],
    },
  });

  useEffect(() => {
    if (!existingBill) return;
    form.reset({
      supplierInvoiceNo: existingBill.supplierInvoiceNo ?? "",
      supplierGstin: existingBill.supplierGstin ?? existingBill.vendor?.gstin ?? "",
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

  const { fields, append, remove } = useFieldArray({
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

  function buildPayload(values: BillFormValues) {
    return {
      vendorId: null,
      kind: "EQUIPMENT" as const,
      supplierInvoiceNo: values.supplierInvoiceNo?.trim() || null,
      supplierGstin: values.supplierGstin?.trim() || null,
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
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to create bill";
        toast.error(message);
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
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to update bill";
          toast.error(message);
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
        title={isEditing ? `Edit Bill ${existingBill?.billNo ?? ""}` : "New Purchase Bill"}
        backTo={isEditing && id ? `/purchase/${id}` : "/purchase"}
        backLabel={isEditing ? "Back to Bill" : "Back to Purchase"}
      />
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Bill details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes / details (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Serial no., warranty, installation notes…"
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
              <CardTitle>Machines / equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseLineItemsField
                mode="EQUIPMENT"
                fields={fields}
                items={items}
                products={undefined}
                register={form.register}
                setValue={form.setValue}
                onProductChange={() => undefined}
                onAdd={() => append({ ...emptyItem })}
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
              onClick={() => navigate(isEditing && id ? `/purchase/${id}` : "/purchase")}
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
