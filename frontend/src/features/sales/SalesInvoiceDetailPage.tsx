import { Printer, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SalesInvoicePrint } from "./SalesInvoicePrint";
import { useDeleteSalesInvoice, useSalesInvoice } from "./useSales";

export function SalesInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useSalesInvoice(id);
  const deleteInvoice = useDeleteSalesInvoice();

  useEffect(() => {
    if (!invoice) return;

    const fileTitle = invoice.invoiceNo.replace(/[\\/:*?"<>|]+/g, "-");

    function handleBeforePrint() {
      // Browser "Save as PDF" uses document.title as the default filename
      document.title = fileTitle;
    }
    function handleAfterPrint() {
      document.title = "PNS ERP";
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.title = "PNS ERP";
    };
  }, [invoice]);

  if (isLoading || !invoice) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  function handleDelete() {
    if (!invoice) return;
    if (
      !confirm(
        `Delete invoice ${invoice.invoiceNo}? This will restore the sold quantities back to stock.`
      )
    ) {
      return;
    }
    deleteInvoice.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(`Invoice ${invoice.invoiceNo} deleted`);
        navigate("/sales");
      },
      onError: () => toast.error("Failed to delete invoice"),
    });
  }

  function handlePrint() {
    document.title = invoice.invoiceNo.replace(/[\\/:*?"<>|]+/g, "-");
    window.print();
    document.title = "PNS ERP";
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        className="print:hidden"
        title={invoice.invoiceNo}
        backTo="/sales"
        backLabel="Back to Sales"
        actions={
          <>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="size-4" />
              Print
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
      />
      <SalesInvoicePrint invoice={invoice} />
    </div>
  );
}
