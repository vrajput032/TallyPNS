import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { LineItemsField } from "@/components/layout/LineItemsField";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomers } from "@/features/customers/useCustomers";
import { useProducts } from "@/features/products/useProducts";
import { useCreateSalesInvoice, useNextInvoiceNo } from "./useSales";
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
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { data: nextInvoiceNo } = useNextInvoiceNo();
  const createInvoice = useCreateSalesInvoice();

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
    if (nextInvoiceNo && !form.formState.dirtyFields.invoiceNo) {
      form.setValue("invoiceNo", nextInvoiceNo);
    }
  }, [nextInvoiceNo, form]);

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

  function onSubmit(values: InvoiceFormValues) {
    const payload = {
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
    createInvoice.mutate(payload, {
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

  return (
    <div className="grid gap-4">
      <PageHeader title="New Sales Invoice" backTo="/sales" backLabel="Back to Sales" />
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
            <Button type="button" variant="outline" onClick={() => navigate("/sales")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
