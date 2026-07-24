import { PageHeader } from "@/components/layout/PageHeader";

export function CashPage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Cash" backTo="/" backLabel="Back to Dashboard" />
      <p className="text-sm text-muted-foreground">This module is coming soon.</p>
    </div>
  );
}
