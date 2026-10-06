import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { PasswordInput } from "@/components/ui/password-input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useIsMobile } from "@/hooks/useIsMobile";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Confirm the new password"),
  })
  .refine((values) => values.newPassword === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = { currentPassword: "", newPassword: "", confirm: "" };

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const isMobile = useIsMobile();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(emptyValues);
    }
  }, [open, form]);

  function onSubmit(values: FormValues) {
    setIsPending(true);
    api
      .post("/auth/me/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      .then(() => {
        toast.success("Password changed");
        onOpenChange(false);
      })
      .catch((error: unknown) => {
        toast.error(apiErrorMessage(error, "Could not change password"));
      })
      .finally(() => setIsPending(false));
  }

  const title = "Change password";
  const description =
    "Use the new password next time you sign in. Devices already signed in stay signed in.";

  const passwordField = (
    name: keyof FormValues,
    label: string,
    autoComplete: "current-password" | "new-password"
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <PasswordInput autoComplete={autoComplete} className="h-11 text-base" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const formBody = (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        {passwordField("currentPassword", "Current password", "current-password")}
        {passwordField("newPassword", "New password", "new-password")}
        {passwordField("confirm", "Confirm new password", "new-password")}
        <Button type="submit" size="lg" className="h-12 text-base sm:hidden" disabled={isPending}>
          {isPending ? "Saving…" : "Change password"}
        </Button>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <p className="px-4 pb-2 text-sm text-muted-foreground">{description}</p>
          <div className="px-4 pb-2">{formBody}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {formBody}
        <DialogFooter>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            {isPending ? "Saving…" : "Change password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
