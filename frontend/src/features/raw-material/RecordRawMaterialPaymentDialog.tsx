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
import { formatInr } from "@/lib/formatInr";
import type { RawMaterialPayment } from "./types";
import { useCreateRawMaterialPayment, useUpdateRawMaterialPayment } from "./useRawMaterial";

const schema = z.object({
  amount: z.coerce.number().positive("Enter amount"),
  mode: z.enum(["CASH", "BANK"]),
  reference: z.string().optional(),
  paymentDate: z.string().min(1),
  narration: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RecordRawMaterialPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  billNo: string;
  balanceAmount: number;
  payment?: RawMaterialPayment | null;
}

export function RecordRawMaterialPaymentDialog({
  open,
  onOpenChange,
  billId,
  billNo,
  balanceAmount,
  payment = null,
}: RecordRawMaterialPaymentDialogProps) {
  const isEditing = payment != null;
  const maxAmount = isEditing ? balanceAmount + Number(payment.amount) : balanceAmount;
  const createPayment = useCreateRawMaterialPayment();
  const updatePayment = useUpdateRawMaterialPayment();
  const isPending = createPayment.isPending || updatePayment.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: balanceAmount,
      mode: "BANK",
      reference: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      narration: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (payment) {
      form.reset({
        amount: Number(payment.amount),
        mode: payment.mode,
        reference: payment.reference ?? "",
        paymentDate: payment.paymentDate.slice(0, 10),
        narration: payment.narration ?? "",
      });
      return;
    }
    form.reset({
      amount: balanceAmount,
      mode: "BANK",
      reference: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      narration: "",
    });
  }, [open, balanceAmount, payment, form]);

  function onSubmit(values: FormValues) {
    if (values.amount > maxAmount + 0.009) {
      toast.error(`Amount cannot exceed ₹${formatInr(maxAmount)}`);
      return;
    }

    const input = {
      amount: values.amount,
      mode: values.mode,
      reference: values.reference || null,
      paymentDate: values.paymentDate,
      narration: values.narration || null,
    };

    if (isEditing && payment) {
      updatePayment.mutate(
        { paymentId: payment.id, input },
        {
          onSuccess: () => {
            toast.success("Payment updated");
            onOpenChange(false);
          },
          onError: (error: unknown) => {
            const message =
              (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              "Failed to update payment";
            toast.error(message);
          },
        }
      );
      return;
    }

    if (!billId) return;
    createPayment.mutate(
      { billId, input },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to record payment";
          toast.error(message);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit payment — ${billNo}` : `Pay supplier — ${billNo}`}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {isEditing
            ? `Max amount: ₹${formatInr(maxAmount)}`
            : `Still to send: ₹${formatInr(balanceAmount)}`}
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
                      <SelectItem value="BANK">Bank</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
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
                  <FormLabel>UTR / Cheque</FormLabel>
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
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEditing ? "Save changes" : "Save payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
