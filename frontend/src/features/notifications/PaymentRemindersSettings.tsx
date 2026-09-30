import { useEffect, useState } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/apiError";
import {
  disablePush,
  enablePush,
  getPushState,
  sendTestPush,
  syncPushSubscription,
  type PushState,
} from "@/lib/pushNotifications";

function stateMessage(state: PushState): string {
  switch (state) {
    case "on":
      return "On for this device. Daily at 11:00 AM when invoices are overdue or due within 7 days.";
    case "off":
      return "Get a daily 11:00 AM alert on this device for overdue invoices and ones due within 7 days.";
    case "denied":
      return "Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.";
    case "needs-install":
      return "On iPhone or iPad, first tap Share → Add to Home Screen, then open PNS ERP from the Home Screen and turn this on.";
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
  const [busy, setBusy] = useState<"toggle" | "test" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPushState().then((next) => {
      if (cancelled) return;
      setState(next);
      if (next === "on") void syncPushSubscription().catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    setBusy("toggle");
    try {
      if (state === "on") {
        setState(await disablePush());
        toast.success("Payment reminders turned off for this device");
      } else {
        const next = await enablePush();
        setState(next);
        if (next === "on") toast.success("Payment reminders turned on for this device");
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not update reminders"));
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    try {
      await sendTestPush();
      toast.success("Test notification sent");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send test notification"));
      setState(await getPushState());
    } finally {
      setBusy(null);
    }
  }

  const canToggle = state === "on" || state === "off";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {state === null ? "Checking this device…" : stateMessage(state)}
      </p>
      {canToggle ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={state === "on" ? "outline" : "default"}
            disabled={busy !== null}
            onClick={toggle}
          >
            {state === "on" ? <BellOff className="size-4" /> : <BellRing className="size-4" />}
            {busy === "toggle" ? "Saving…" : state === "on" ? "Turn off" : "Turn on"}
          </Button>
          {state === "on" ? (
            <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={test}>
              <Send className="size-4" />
              {busy === "test" ? "Sending…" : "Send test"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
