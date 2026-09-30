import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage } from "@/lib/apiError";
import {
  bootstrapPushWithRetry,
  enablePush,
  needsPushPermissionPrompt,
} from "@/lib/pushNotifications";

/**
 * On first load, asks for notification permission (browser requires a tap).
 * If permission was granted before, re-subscribes silently and stays on.
 */
export function PaymentRemindersBootstrap() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void bootstrapPushWithRetry().then((state) => {
      if (cancelled) return;
      if (state === "off" && needsPushPermissionPrompt()) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function allow() {
    setBusy(true);
    try {
      const next = await enablePush();
      if (next === "on") {
        setOpen(false);
        toast.success("Payment reminders are on for this device");
        return;
      }
      if (next === "denied") {
        setOpen(false);
        toast.error("Notifications blocked. Allow them in browser or phone settings, then reload.");
        return;
      }
      toast.message("Permission not granted yet. Try again when you're ready.");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not turn on reminders"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" />
            Daily payment reminders
          </DialogTitle>
          <DialogDescription>
            Allow notifications once on this device. We will send a reminder at 11:00 AM when customer
            invoices are overdue or due within 7 days. After you allow, reminders stay on automatically.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
            Not now
          </Button>
          <Button type="button" disabled={busy} onClick={allow}>
            {busy ? "Turning on…" : "Allow notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
