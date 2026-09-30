import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentRemindersSettings } from "./PaymentRemindersSettings";

/** Desktop top bar: payment reminders + Send test (wide layout has no account sheet). */
export function PaymentRemindersMenu() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <Bell className="size-5" />
            <span className="sr-only">Payment reminders</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment reminders</DialogTitle>
        </DialogHeader>
        <PaymentRemindersSettings />
      </DialogContent>
    </Dialog>
  );
}
