import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { apiErrorMessage } from "@/lib/apiError";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { AppUser } from "./types";
import { useResetUserPassword } from "./useUsers";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Confirm the password"),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = { password: "", confirm: "" };

type UserResetPasswordDialogProps = {
  user: AppUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserResetPasswordDialog({ user, open, onOpenChange }: UserResetPasswordDialogProps) {
  const isMobile = useIsMobile();
  const resetPassword = useResetUserPassword();

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
    if (!user) return;
    resetPassword
      .mutateAsync({ id: user.id, password: values.password })
      .then(() => {
        toast.success(`Password updated for ${user.username}`);
        onOpenChange(false);
      })
      .catch((error: unknown) => {
        toast.error(apiErrorMessage(error, "Could not reset password"));
      });
  }

  const title = user ? `Reset password — ${user.username}` : "Reset password";
  const description =
    "Set a new sign-in password. Other devices signed in as this user will need to log in again.";

  const formBody = (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  className="h-11 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
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
          disabled={resetPassword.isPending || !user}
        >
          {resetPassword.isPending ? "Saving…" : "Save password"}
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
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={resetPassword.isPending || !user}
          >
            {resetPassword.isPending ? "Saving…" : "Save password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
