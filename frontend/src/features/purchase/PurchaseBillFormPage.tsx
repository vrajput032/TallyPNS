import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/features/products/useProducts";
import { useVendors } from "@/features/vendors/useVendors";
import { useCreatePurchaseBill } from "./usePurchase";

const lineItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().positive("Qty must be greater than 0"),
  rate: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0).max(100),
});

const billFormSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  items: z.array(lineItemSchema).min(1, "Add at least one item"),
});

type BillFormValues = z.infer<typeof billFormSchema>;

export function PurchaseBillFormPage() {
  const navigate = useNavigate();
  const { data: vendors } = useVendors();
  const { data: products } = useProducts();
  const createBill = useCreatePurchaseBill();

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      vendorId: "",
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

  function onSubmit(values: BillFormValues) {
    createBill.mutate(values, {
      onSuccess: (bill) => {
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

  return (
    <div className="grid gap-4">
      <PageHeader title="New Purchase Bill" backTo="/purchase" backLabel="Back to Purchase" />
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel>Bill From</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vendor">
                            {(value: string | null) =>
                              vendors?.find((vendor) => vendor.id === value)?.name ?? "Select a vendor"
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
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
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <LineItemsField
                fields={fields}
                items={items}
                products={products}
                register={form.register}
                onProductChange={handleProductChange}
                onAdd={() => append({ productId: "", quantity: 1, rate: 0, gstRate: 18 })}
                onRemove={remove}
                errorMessage={form.formState.errors.items?.message}
              />
              <div className="mt-4 flex justify-end text-lg font-semibold">
                Grand Total: {grandTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/purchase")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBill.isPending}>
              {createBill.isPending ? "Saving..." : "Save Bill"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
