import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { LineItemsField } from "@/components/layout/LineItemsField";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomers } from "@/features/customers/useCustomers";
import { useProducts } from "@/features/products/useProducts";
import {
  useCreateSalesInvoice,
  useNextInvoiceNo,
  useSalesInvoice,
  useUpdateSalesInvoice,
} from "./useSales";
import { formatInr } from "@/lib/formatInr";

const lineItemSchema = z
  .object({
    isManual: z.boolean().optional(),
    productId: z.string().optional(),
    description: z.string().optional(),
    hsn: z.string().optional(),
    unit: z.string().optional(),
    sizeMm: z.coerce.number().positive().optional().nullable(),
    quantity: z.coerce.number().positive("Qty must be greater than 0"),
    rate: z.coerce.number().min(0),
    gstRate: z.coerce.number().min(0).max(100),
  })
  .superRefine((item, ctx) => {
    if (item.isManual) {
      if (!item.description?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a description",
          path: ["description"],
        });
      }
      return;
    }
    if (!item.productId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a product",
        path: ["productId"],
      });
    }
  });

const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  invoiceNo: z.string().trim().max(60).optional(),
  transport: z.string().trim().max(100).optional(),
  vehicleNo: z.string().trim().max(40).optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one item"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const emptyProductItem = {
  isManual: false,
  productId: "",
  description: "",
  hsn: "",
  unit: "NOS",
  sizeMm: undefined as number | undefined,
  quantity: 1,
  rate: 0,
  gstRate: 18,
};

const emptyManualItem = {
  isManual: true,
  productId: "",
  description: "",
  hsn: "",
  unit: "NOS",
  sizeMm: undefined as number | undefined,
  quantity: 1,
  rate: 0,
  gstRate: 18,
};

export function SalesInvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { data: nextInvoiceNo } = useNextInvoiceNo();
  const { data: existingInvoice, isLoading: isLoadingInvoice } = useSalesInvoice(
    isEditing ? id : undefined
  );
  const createInvoice = useCreateSalesInvoice();
  const updateInvoice = useUpdateSalesInvoice();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<InvoiceFormValues | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: "",
      invoiceNo: "",
      transport: "REGULAR",
      vehicleNo: "",
      items: [{ ...emptyProductItem }],
    },
  });

  useEffect(() => {
    if (!isEditing && nextInvoiceNo && !form.formState.dirtyFields.invoiceNo) {
      form.setValue("invoiceNo", nextInvoiceNo);
    }
  }, [isEditing, nextInvoiceNo, form]);

  useEffect(() => {
    if (!existingInvoice) return;
    form.reset({
      customerId: existingInvoice.customerId,
      invoiceNo: existingInvoice.invoiceNo,
      transport: existingInvoice.transport ?? "",
      vehicleNo: existingInvoice.vehicleNo ?? "",
      items: existingInvoice.items.map((item) => ({
        isManual: !item.productId,
        productId: item.productId ?? "",
        description: item.description ?? "",
        hsn: item.hsn ?? "",
        unit: item.unit ?? "NOS",
        sizeMm: item.sizeMm != null ? Number(item.sizeMm) : undefined,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        gstRate: Number(item.gstRate),
      })),
    });
  }, [existingInvoice, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const grandTotal = items.reduce((sum, item) => {
    const base = (item.quantity || 0) * (item.rate || 0);
    return sum + base + (base * (item.gstRate || 0)) / 100;
  }, 0);

  function handleProductChange(index: number, productId: string) {
    const product = products?.find((p) => p.id === productId);
    form.setValue(`items.${index}.isManual`, false);
    form.setValue(`items.${index}.productId`, productId);
    form.setValue(`items.${index}.description`, "");
    if (product) {
      form.setValue(`items.${index}.rate`, Number(product.price));
      form.setValue(`items.${index}.gstRate`, Number(product.gstRate));
    }
  }

  function buildPayload(values: InvoiceFormValues) {
    return {
      customerId: values.customerId,
      invoiceNo: values.invoiceNo,
      transport: values.transport,
      vehicleNo: values.vehicleNo,
      items: values.items.map((item) => {
        if (item.isManual) {
          return {
            productId: null,
            description: item.description?.trim() || null,
            hsn: item.hsn?.trim() || null,
            unit: item.unit?.trim() || "NOS",
            sizeMm: null,
            quantity: item.quantity,
            rate: item.rate,
            gstRate: item.gstRate,
          };
        }
        return {
          productId: item.productId,
          description: null,
          hsn: null,
          unit: null,
          sizeMm:
            item.sizeMm != null && !Number.isNaN(item.sizeMm) && item.sizeMm > 0
              ? item.sizeMm
              : null,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
        };
      }),
    };
  }

  function onSubmit(values: InvoiceFormValues) {
    if (isEditing) {
      setPendingValues(values);
      setPinDialogOpen(true);
      return;
    }

    createInvoice.mutate(buildPayload(values), {
      onSuccess: (invoice) => {
        toast.success(`Invoice ${invoice.invoiceNo} created`);
        navigate(`/sales/${invoice.id}`);
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to create invoice";
        toast.error(message);
      },
    });
  }

  function confirmEdit(pin: string) {
    if (!id || !pendingValues) return;
    updateInvoice.mutate(
      { id, pin, input: buildPayload(pendingValues) },
      {
        onSuccess: (invoice) => {
          toast.success(`Invoice ${invoice.invoiceNo} updated`);
          setPinDialogOpen(false);
          setPendingValues(null);
          navigate(`/sales/${invoice.id}`);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to update invoice";
          toast.error(message);
        },
      }
    );
  }

  if (isEditing && isLoadingInvoice) {
    return <FormSkeleton />;
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={isEditing ? `Edit Invoice ${existingInvoice?.invoiceNo ?? ""}` : "New Sales Invoice"}
        backTo={isEditing && id ? `/sales/${id}` : "/sales"}
        backLabel={isEditing ? "Back to Invoice" : "Back to Sales"}
      />
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Customer &amp; Transport</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 sm:max-w-sm">
                    <FormLabel>Bill To</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer">
                            {(value: string | null) =>
                              customers?.find((customer) => customer.id === value)?.name ??
                              "Select a customer"
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice No.</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transport</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. REGULAR" {...field} value={field.value ?? ""} />
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
                    <FormLabel>Vehicle No.</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. DL05EC5993"
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
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Use <strong>Add Product</strong> for stock items, or{" "}
                <strong>Add Manual Item</strong> for scraps, construction, electricity, and other
                non-stock charges.
              </p>
              <LineItemsField
                fields={fields}
                items={items}
                products={products}
                register={form.register}
                onProductChange={handleProductChange}
                onAdd={() => append({ ...emptyProductItem })}
                onAddManual={() => append({ ...emptyManualItem })}
                onRemove={remove}
                errorMessage={form.formState.errors.items?.message}
                showSizeMm
                allowManual
              />
              <div className="mt-4 flex justify-end text-lg font-semibold">
                Grand Total: ₹{formatInr(grandTotal)}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditing && id ? `/sales/${id}` : "/sales")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending || updateInvoice.isPending}>
              {createInvoice.isPending || updateInvoice.isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Save Invoice"}
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
        title="Confirm invoice edit"
        description="Editing this invoice will recalculate stock and totals. Enter the PIN to confirm."
        confirmLabel="Save Changes"
        confirmVariant="default"
        pinLabel="Edit PIN"
        isPending={updateInvoice.isPending}
        onConfirm={confirmEdit}
      />
    </div>
  );
}
