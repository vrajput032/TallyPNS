import { Printer } from "lucide-react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { PurchaseBillPrint } from "./PurchaseBillPrint";
import { usePurchaseBill } from "./usePurchase";

export function PurchaseBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: bill, isLoading } = usePurchaseBill(id);

  if (isLoading || !bill) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        className="print:hidden"
        title={bill.billNo}
        backTo="/purchase"
        backLabel="Back to Purchase"
        actions={
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        }
      />
      <PurchaseBillPrint bill={bill} />
    </div>
  );
}
