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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useCreateUser } from "./useUsers";
import type { UserRole } from "./types";

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, numbers, dots, underscores, and hyphens"),
  name: z.string().trim().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["STAFF", "ADMIN"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

const emptyValues: CreateUserValues = {
  username: "",
  name: "",
  password: "",
  role: "STAFF",
};

const ROLE_OPTIONS: { value: UserRole; title: string; hint: string }[] = [
  { value: "STAFF", title: "Staff", hint: "Add and edit only" },
  { value: "ADMIN", title: "Admin", hint: "Full access, can delete" },
];

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormDialog({ open, onOpenChange }: UserFormDialogProps) {
  const isMobile = useIsMobile();
  const createUser = useCreateUser();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(emptyValues);
    }
  }, [open, form]);

  function onSubmit(values: CreateUserValues) {
    createUser
      .mutateAsync({
        username: values.username.trim().toLowerCase(),
        name: values.name.trim(),
        password: values.password,
        role: values.role,
      })
      .then(() => {
        toast.success(`User ${values.username.toLowerCase()} created`);
        onOpenChange(false);
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not create user";
        toast.error(message);
      });
  }

  const formBody = (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder="e.g. ravi"
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder="Display name"
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
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
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((option) => {
                    const selected = field.value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition-colors active:scale-[0.98]",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background"
                        )}
                      >
                        <p className="text-sm font-semibold">{option.title}</p>
                        <p className="text-xs text-muted-foreground">{option.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 text-base sm:hidden"
          disabled={createUser.isPending}
        >
          {createUser.isPending ? "Creating..." : "Create user"}
        </Button>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            <SheetTitle>New user</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-2">{formBody}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
        </DialogHeader>
        {formBody}
        <DialogFooter>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={createUser.isPending}>
            {createUser.isPending ? "Creating..." : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
