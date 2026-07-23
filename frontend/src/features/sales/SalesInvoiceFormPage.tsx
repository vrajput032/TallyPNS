import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomers } from "@/features/customers/useCustomers";
import { useProducts } from "@/features/products/useProducts";
import { useCreateSalesInvoice } from "./useSales";

const lineItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().positive("Qty must be greater than 0"),
  rate: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0).max(100),
});

const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  items: z.array(lineItemSchema).min(1, "Add at least one item"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function SalesInvoiceFormPage() {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const createInvoice = useCreateSalesInvoice();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: "",
      items: [{ productId: "", quantity: 1, rate: 0, gstRate: 18 }],
    },
  });

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
    form.setValue(`items.${index}.productId`, productId);
    if (product) {
      form.setValue(`items.${index}.rate`, Number(product.price));
      form.setValue(`items.${index}.gstRate`, Number(product.gstRate));
    }
  }

  function onSubmit(values: InvoiceFormValues) {
    createInvoice.mutate(values, {
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
      <h1 className="text-2xl font-semibold">New Sales Invoice</h1>
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel>Bill To</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: "", quantity: 1, rate: 0, gstRate: 18 })}
              >
                <Plus className="size-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
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
                              if (value) handleProductChange(index, value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
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
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.quantity`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.rate`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.gstRate`)}
                          />
                        </TableCell>
                        <TableCell className="text-right">{amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {form.formState.errors.items?.message && (
                <p className="mt-2 text-sm text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}
              <div className="mt-4 flex justify-end text-lg font-semibold">
                Grand Total: {grandTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
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
