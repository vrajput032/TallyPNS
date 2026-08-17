import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useProducts } from "@/features/products/useProducts";
import { PIPE_SIZES_MM, formatPipeSize } from "@/lib/pipeSizes";
import { useCreateAdjustment } from "./useInventory";

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  sizeMm: z.coerce.number().refine((n) => (PIPE_SIZES_MM as readonly number[]).includes(n), {
    message: "Select a size",
  }),
  direction: z.enum(["increase", "decrease"]),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

const emptyValues: AdjustmentFormValues = {
  productId: "",
  sizeMm: 95,
  direction: "increase",
  quantity: 1,
  reason: "",
};

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a product when opened from tapping a stock card. */
  initialProductId?: string;
  /** Pre-select a size when opened from tapping a specific size card. */
  initialSizeMm?: number;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  initialProductId,
  initialSizeMm,
}: StockAdjustmentDialogProps) {
  const isMobile = useIsMobile();
  const { data: products } = useProducts();
  const createAdjustment = useCreateAdjustment();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: emptyValues,
  });

  // Only one product exists (MS Pipe), so it's always auto-selected — no picker needed.
  const soleProductId = initialProductId ?? products?.[0]?.id ?? "";

  useEffect(() => {
    if (open) {
      form.reset({
        ...emptyValues,
        productId: soleProductId,
        sizeMm: initialSizeMm ?? emptyValues.sizeMm,
      });
    }
  }, [open, soleProductId, initialSizeMm, form]);

  const selectedProduct = products?.find((p) => p.id === form.watch("productId"));

  function onSubmit(values: AdjustmentFormValues) {
    const signedQuantity = values.direction === "increase" ? values.quantity : -values.quantity;
    createAdjustment.mutate(
      { productId: values.productId, sizeMm: values.sizeMm, quantity: signedQuantity, reason: values.reason },
      {
        onSuccess: () => {
          toast.success("Stock adjusted");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to adjust stock";
          toast.error(message);
        },
      }
    );
  }

  const formBody = (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        {selectedProduct && (
          <p className="text-sm text-muted-foreground">
            Adjusting stock for <span className="font-medium text-foreground">{selectedProduct.name}</span>
          </p>
        )}

        {/* Size picker as large tap targets — faster than a dropdown on a touchscreen. */}
        <FormField
          control={form.control}
          name="sizeMm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item size</FormLabel>
              <div className="grid grid-cols-5 gap-2">
                {PIPE_SIZES_MM.map((sizeMm) => (
                  <button
                    key={sizeMm}
                    type="button"
                    onClick={() => field.onChange(sizeMm)}
                    className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                      field.value === sizeMm
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-transparent hover:bg-muted"
                    }`}
                  >
                    {formatPipeSize(sizeMm)}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Increase/Decrease as a segmented control instead of a dropdown. */}
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direction</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => field.onChange("increase")}
                  className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                    field.value === "increase"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-input bg-transparent hover:bg-muted"
                  }`}
                >
                  + Increase
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange("decrease")}
                  className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                    field.value === "decrease"
                      ? "border-destructive bg-destructive text-white"
                      : "border-input bg-transparent hover:bg-muted"
                  }`}
                >
                  − Decrease
                </button>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Quantity{selectedProduct ? ` (${selectedProduct.unit})` : ""}
              </FormLabel>
              <FormControl>
                <Input type="number" inputMode="decimal" step="0.01" className="h-11 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Physical count correction"
                  className="h-11 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="h-12 text-base sm:hidden"
          disabled={createAdjustment.isPending}
        >
          {createAdjustment.isPending ? "Saving..." : "Save Adjustment"}
        </Button>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            <SheetTitle>Stock Adjustment</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{formBody}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
        </DialogHeader>
        {formBody}
        <DialogFooter>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={createAdjustment.isPending}>
            {createAdjustment.isPending ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
