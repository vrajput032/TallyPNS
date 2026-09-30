import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/apiError";
import {
  bootstrapPushWithRetry,
  enablePush,
  getPushState,
  needsPushPermissionPrompt,
  sendTestPush,
  type PushState,
} from "@/lib/pushNotifications";
import { playReminderSound } from "@/lib/reminderSound";

function stateMessage(state: PushState): string {
  switch (state) {
    case "on":
      return "On for this device. Daily at 11:00 AM when invoices are overdue or due within 7 days.";
    case "off":
      return "Tap Allow below once. Reminders then stay on for this device.";
    case "denied":
      return "Notifications are blocked. Allow PNS ERP in browser or phone settings, then reload.";
    case "needs-install":
      return "On iPhone or iPad, add PNS ERP to the Home Screen and open it from there.";
    case "unsupported":
      return "This browser does not support notifications.";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function PaymentRemindersSettings() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<"allow" | "test" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const quick = await getPushState({ quick: true });
      if (!cancelled) setState(quick);
      const full = await getPushState();
      if (!cancelled) setState(full);
      const bootstrapped = await bootstrapPushWithRetry();
      if (!cancelled) setState(bootstrapped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function allow() {
    setBusy("allow");
    try {
      const next = await enablePush();
      setState(next);
      if (next === "on") toast.success("Payment reminders are on");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not turn on reminders"));
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    try {
      await sendTestPush();
      playReminderSound();
      toast.success("Test notification sent");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send test notification"));
      setState(await getPushState());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {state === null ? "Checking this device…" : stateMessage(state)}
      </p>
      <div className="flex flex-wrap gap-2">
        {state === "off" ? (
          <Button type="button" size="sm" disabled={busy !== null} onClick={allow}>
            {busy === "allow"
              ? "Waiting…"
              : needsPushPermissionPrompt()
                ? "Allow notifications"
                : "Turn on reminders"}
          </Button>
        ) : null}
        {state === "on" ? (
          <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={test}>
            <Send className="size-4" />
            {busy === "test" ? "Sending…" : "Send test"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
