import { ArrowLeft, Printer } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SalesInvoicePrint } from "./SalesInvoicePrint";
import { useSalesInvoice } from "./useSales";

export function SalesInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useSalesInvoice(id);

  if (isLoading || !invoice) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate("/sales")}>
          <ArrowLeft className="size-4" />
          Back to Sales
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Print
        </Button>
      </div>
      <SalesInvoicePrint invoice={invoice} />
    </div>
  );
}
