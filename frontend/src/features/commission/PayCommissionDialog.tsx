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
import { formatInr } from "@/lib/formatInr";
import { useCreateCommissionPayment } from "./useCommission";

const schema = z.object({
  amount: z.coerce.number().positive("Enter amount"),
  mode: z.enum(["CASH", "BANK"]),
  reference: z.string().optional(),
  paymentDate: z.string().min(1),
  narration: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function defaults(due: number): FormValues {
  return {
    amount: Math.max(due, 0),
    mode: "CASH",
    reference: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    narration: "",
  };
}

export function PayCommissionDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  due,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  due: number;
}) {
  const createPayment = useCreateCommissionPayment();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(due) });

  useEffect(() => {
    if (open) form.reset(defaults(due));
  }, [open, due, form]);

  function onSubmit(values: FormValues) {
    if (values.amount > due + 0.009) {
      toast.error(`Amount cannot exceed commission due ₹${formatInr(Math.max(due, 0))}`);
      return;
    }
    createPayment.mutate(
      {
        customerId,
        amount: values.amount,
        mode: values.mode,
        reference: values.reference || null,
        paymentDate: values.paymentDate,
        narration: values.narration || null,
      },
      {
        onSuccess: (payment) => {
          toast.success(`Commission ${payment.paymentNo} paid to ${customerName}`);
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          toast.error(apiErrorMessage(error, "Failed to record commission payment"));
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay commission — {customerName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Commission due: ₹{formatInr(Math.max(due, 0))}. It will show as money out in the cash / bank book.
        </p>
        <Form {...form}>
          <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid from</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentDate"
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
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (UTR / Cheque)</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="narration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Narration</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending || due <= 0}>
                {createPayment.isPending ? "Saving..." : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
