import { PageHeader } from "@/components/layout/PageHeader";

export function BankPage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Bank" backTo="/" backLabel="Back to Dashboard" />
      <p className="text-sm text-muted-foreground">This module is coming soon.</p>
    </div>
  );
}
