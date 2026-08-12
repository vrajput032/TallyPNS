import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/features/products/useProducts";
import { useVendors } from "@/features/vendors/useVendors";
import { KG_PER_TON, PurchaseLineItemsField } from "./PurchaseLineItemsField";
import { useCreatePurchaseBill, usePurchaseBill, useUpdatePurchaseBill } from "./usePurchase";
import { formatInr } from "@/lib/formatInr";

const lineItemSchema = z.object({
  productId: z.string().min(1, "Select a material"),
  quantity: z.coerce.number().positive("Qty (Tons) must be greater than 0"),
  pricePerKg: z.coerce.number().min(0, "Price/Kg is required"),
  rate: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0).max(100),
});

const billFormSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  transport: z.string().trim().max(100).optional(),
  vehicleNo: z.string().trim().max(40).optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one item"),
});

type BillFormValues = z.infer<typeof billFormSchema>;

const emptyItem = { productId: "", quantity: 1, pricePerKg: 0, rate: 0, gstRate: 18 };

export function PurchaseBillFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { data: vendors } = useVendors();
  const { data: products } = useProducts();
  const { data: existingBill, isLoading: isLoadingBill } = usePurchaseBill(
    isEditing ? id : undefined
  );
  const createBill = useCreatePurchaseBill();
  const updateBill = useUpdatePurchaseBill();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BillFormValues | null>(null);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      vendorId: "",
      transport: "",
      vehicleNo: "",
      items: [{ ...emptyItem }],
    },
  });

  useEffect(() => {
    if (!existingBill) return;
    form.reset({
      vendorId: existingBill.vendorId,
      transport: existingBill.transport ?? "",
      vehicleNo: existingBill.vehicleNo ?? "",
      items: existingBill.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        pricePerKg: item.pricePerKg != null ? Number(item.pricePerKg) : 0,
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
    const pricePerKg = Number(item.pricePerKg) || 0;
    const qty = Number(item.quantity) || 0;
    const gst = Number(item.gstRate) || 0;
    const rate =
      pricePerKg > 0
        ? Math.round(pricePerKg * KG_PER_TON * 100) / 100
        : Number(item.rate) || 0;
    const base = qty * rate;
    return sum + base + (base * gst) / 100;
  }, 0);
  const totalTons = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  function handleProductChange(index: number, productId: string) {
    const product = products?.find((p) => p.id === productId);
    form.setValue(`items.${index}.productId`, productId);
    if (product) {
      const pricePerKg = Number(product.price);
      form.setValue(`items.${index}.pricePerKg`, pricePerKg);
      form.setValue(
        `items.${index}.rate`,
        Math.round(pricePerKg * KG_PER_TON * 100) / 100
      );
      form.setValue(`items.${index}.gstRate`, Number(product.gstRate));
    }
  }

  function buildPayload(values: BillFormValues) {
    return {
      vendorId: values.vendorId,
      transport: values.transport?.trim() || null,
      vehicleNo: values.vehicleNo?.trim() || null,
      items: values.items.map((item) => {
        const rate =
          item.pricePerKg > 0
            ? Math.round(item.pricePerKg * KG_PER_TON * 100) / 100
            : item.rate;
        return {
          productId: item.productId,
          quantity: item.quantity,
          pricePerKg: item.pricePerKg,
          rate,
          gstRate: item.gstRate,
        };
      }),
    };
  }

  function onSubmit(values: BillFormValues) {
    if (isEditing) {
      setPendingValues(values);
      setPinDialogOpen(true);
      return;
    }

    createBill.mutate(buildPayload(values), {
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

  function confirmEdit(pin: string) {
    if (!id || !pendingValues) return;
    updateBill.mutate(
      { id, pin, input: buildPayload(pendingValues) },
      {
        onSuccess: (bill) => {
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
    return <p className="text-sm text-muted-foreground">Loading...</p>;
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
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 sm:max-w-sm">
                    <FormLabel>Bill From</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vendor">
                            {(value: string | null) =>
                              vendors?.find((vendor) => vendor.id === value)?.name ??
                              "Select a vendor"
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
              <FormField
                control={form.control}
                name="transport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transport (optional)</FormLabel>
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
                    <FormLabel>Vehicle No. (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. HR55AB1234"
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
              <CardTitle>Raw Material (Tons)</CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseLineItemsField
                fields={fields}
                items={items}
                products={products}
                register={form.register}
                setValue={form.setValue}
                onProductChange={handleProductChange}
                onAdd={() => append({ ...emptyItem })}
                onRemove={remove}
                errorMessage={form.formState.errors.items?.message}
              />
              <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                <div className="text-muted-foreground">
                  Total qty: {totalTons.toFixed(3)} Tons ({(totalTons * KG_PER_TON).toFixed(0)} Kg)
                </div>
                <div className="text-lg font-semibold">Grand Total: ₹{formatInr(grandTotal)}</div>
              </div>
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
            <Button type="submit" disabled={createBill.isPending || updateBill.isPending}>
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
        description="Editing this bill will recalculate stock and totals. Enter the PIN to confirm."
        confirmLabel="Save Changes"
        confirmVariant="default"
        pinLabel="Edit PIN"
        isPending={updateBill.isPending}
        onConfirm={confirmEdit}
      />
    </div>
  );
}
