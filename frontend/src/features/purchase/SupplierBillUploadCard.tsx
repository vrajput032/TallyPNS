import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiErrorMessage } from "@/lib/apiError";
import { formatInr } from "@/lib/formatInr";
import type { ParsedSupplierInvoice } from "./types";
import { useParseSupplierBill } from "./usePurchase";

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

interface SupplierBillUploadCardProps {
  /** Called for every picked file so it is attached when the bill is saved. */
  onFile: (file: File) => void;
  onParsed: (parsed: ParsedSupplierInvoice) => void;
}

export function SupplierBillUploadCard({ onFile, onParsed }: SupplierBillUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const parse = useParseSupplierBill();
  const [result, setResult] = useState<ParsedSupplierInvoice | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    onFile(file);
    setResult(null);

    if (!isPdf(file)) {
      setImageName(file.name);
      return;
    }
    setImageName(null);
    parse.mutate(file, {
      onSuccess: (parsed) => {
        setResult(parsed);
        onParsed(parsed);
        if (parsed.items.length > 0) {
          toast.success("Bill details filled from the PDF — check them before saving");
        } else {
          toast.warning("Could not read the items from this PDF — fill them in manually");
        }
      },
      onError: (error: unknown) => {
        toast.error(apiErrorMessage(error, "Could not read this PDF — fill the details manually"));
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier bill</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Upload the supplier&apos;s tax invoice. PDF details are filled in automatically; photos
            are attached and you fill the details below.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={parse.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {parse.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            {parse.isPending ? "Reading bill…" : "Upload bill"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        {imageName ? (
          <p className="text-sm text-muted-foreground">
            {imageName} will be attached. Details can only be read from PDFs, so fill them in below.
          </p>
        ) : null}

        {result ? (
          <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Read {result.items.length} item{result.items.length === 1 ? "" : "s"} from{" "}
              {result.sourceFileName}
            </p>
            {result.totalAmount != null ? (
              <p className="text-muted-foreground">
                Bill total on PDF: ₹{formatInr(result.totalAmount)}
                {result.taxAmount != null ? ` (GST ₹${formatInr(result.taxAmount)})` : ""}
              </p>
            ) : null}
            {result.warnings.map((warning) => (
              <p key={warning} className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
