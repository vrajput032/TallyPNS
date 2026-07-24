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
import { useCreateReceipt } from "./usePayments";

const schema = z.object({
  amount: z.coerce.number().positive("Enter amount"),
  mode: z.enum(["CASH", "BANK"]),
  reference: z.string().optional(),
  receiptDate: z.string().min(1),
  narration: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RecordReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesInvoiceId: string;
  invoiceNo: string;
  balanceAmount: number;
}

export function RecordReceiptDialog({
  open,
  onOpenChange,
  salesInvoiceId,
  invoiceNo,
  balanceAmount,
}: RecordReceiptDialogProps) {
  const createReceipt = useCreateReceipt();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: balanceAmount,
      mode: "CASH",
      reference: "",
      receiptDate: new Date().toISOString().slice(0, 10),
      narration: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: balanceAmount,
        mode: "CASH",
        reference: "",
        receiptDate: new Date().toISOString().slice(0, 10),
        narration: "",
      });
    }
  }, [open, balanceAmount, form]);

  function onSubmit(values: FormValues) {
    if (values.amount > balanceAmount + 0.009) {
      toast.error(`Amount cannot exceed balance ₹${balanceAmount.toFixed(2)}`);
      return;
    }
    createReceipt.mutate(
      {
        salesInvoiceId,
        amount: values.amount,
        mode: values.mode,
        reference: values.reference || null,
        receiptDate: values.receiptDate,
        narration: values.narration || null,
      },
      {
        onSuccess: (receipt) => {
          toast.success(`Receipt ${receipt.receiptNo} recorded`);
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to record receipt";
          toast.error(message);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Receipt — {invoiceNo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Balance due: ₹{balanceAmount.toFixed(2)}
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
                  <FormLabel>Received in</FormLabel>
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
              name="receiptDate"
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
              <Button type="submit" disabled={createReceipt.isPending}>
                {createReceipt.isPending ? "Saving..." : "Save Receipt"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
