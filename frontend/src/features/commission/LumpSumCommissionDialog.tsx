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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiErrorMessage } from "@/lib/apiError";
import { useSaveCommissionEntry } from "./useCommission";

const FIRST_MONTH = "2026-07";

const schema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month")
    .refine((value) => value >= FIRST_MONTH, "Commission starts from July 2026"),
  amount: z.coerce.number().positive("Enter amount"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type LumpSumEditTarget = { id: string; month: string; amount: number; note: string | null };

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function LumpSumCommissionDialog({
  open,
  onOpenChange,
  customers,
  customerId,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Customers to choose from; hidden when `customerId` is fixed. */
  customers: { id: string; name: string }[];
  customerId?: string;
  editing?: LumpSumEditTarget | null;
}) {
  const saveEntry = useSaveCommissionEntry();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerId: customerId ?? "", month: currentMonth(), amount: 0, note: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      customerId: customerId ?? "",
      month: editing?.month ?? currentMonth(),
      amount: editing?.amount ?? 0,
      note: editing?.note ?? "",
    });
  }, [open, customerId, editing, form]);

  function onSubmit(values: FormValues) {
    saveEntry.mutate(
      {
        id: editing?.id,
        input: {
          customerId: values.customerId,
          month: values.month,
          amount: values.amount,
          note: values.note?.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Lump-sum commission updated" : "Lump-sum commission added");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          toast.error(apiErrorMessage(error, "Failed to save lump-sum commission"));
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lump-sum commission" : "Add lump-sum commission"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          One amount for the whole month, added on top of bill commission. Use it for old months or
          deals not tied to a single bill.
        </p>
        <Form {...form}>
          <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
            {customerId ? null : (
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(String(value))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick a customer">
                            {(value: string | null) =>
                              customers.find((customer) => customer.id === value)?.name ?? "Pick a customer"
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
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
            )}
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <FormControl>
                    <Input type="month" min={FIRST_MONTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional (e.g. July bills)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveEntry.isPending}>
                {saveEntry.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
