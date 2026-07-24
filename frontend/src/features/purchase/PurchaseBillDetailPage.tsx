import { Printer, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { PurchaseBillPrint } from "./PurchaseBillPrint";
import { useDeletePurchaseBill, usePurchaseBill } from "./usePurchase";

export function PurchaseBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading } = usePurchaseBill(id);
  const deleteBill = useDeletePurchaseBill();

  if (isLoading || !bill) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  function handleDelete() {
    if (!bill) return;
    if (
      !confirm(
        `Delete bill ${bill.billNo}? This will reverse the stock added by this bill.`
      )
    ) {
      return;
    }
    deleteBill.mutate(bill.id, {
      onSuccess: () => {
        toast.success(`Bill ${bill.billNo} deleted`);
        navigate("/purchase");
      },
      onError: () => toast.error("Failed to delete bill"),
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        className="print:hidden"
        title={bill.billNo}
        backTo="/purchase"
        backLabel="Back to Purchase"
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBill.isPending}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
      />
      <PurchaseBillPrint bill={bill} />
    </div>
  );
}
