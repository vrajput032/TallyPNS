import { ArrowLeft, Bot, Check, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCustomers } from "@/features/customers/useCustomers";
import { useProducts } from "@/features/products/useProducts";
import { formatInr } from "@/lib/formatInr";
import { formatPipeSize, PIPE_SIZES_MM } from "@/lib/pipeSizes";
import {
  buildSalesInvoicePayload,
  invoiceGrandTotal,
  lineAmount,
  type InvoiceLineDraft,
} from "./salesInvoicePayload";
import { useCreateSalesInvoice, useNextInvoiceNo } from "./useSales";

type ChatStep = "customer" | "catalogLine" | "manualLine" | "afterLine" | "review";

const emptyCatalogLine = (): InvoiceLineDraft => ({
  isManual: false,
  productId: "",
  quantity: 1,
  rate: 0,
  gstRate: 18,
  sizeMm: undefined,
});

const emptyManualLine = (): InvoiceLineDraft => ({
  isManual: true,
  description: "",
  hsn: "",
  unit: "NOS",
  quantity: 1,
  rate: 0,
  gstRate: 18,
});

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="size-4" />
      </div>
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
        {children}
      </div>
    </div>
  );
}

type SalesInvoiceChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SalesInvoiceChatSheet({ open, onOpenChange }: SalesInvoiceChatSheetProps) {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { data: nextInvoiceNo } = useNextInvoiceNo();
  const createInvoice = useCreateSalesInvoice();

  const [step, setStep] = useState<ChatStep>("customer");
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [lines, setLines] = useState<InvoiceLineDraft[]>([]);
  const [draft, setDraft] = useState<InvoiceLineDraft>(emptyCatalogLine());
  const [transport, setTransport] = useState("REGULAR");
  const [vehicleNo, setVehicleNo] = useState("");

  const selectedCustomer = customers?.find((c) => c.id === customerId);

  const filteredCustomers = useMemo(() => {
    const list = customers ?? [];
    const q = customerQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, customerQuery]);

  function resetChat() {
    setStep("customer");
    setCustomerId("");
    setCustomerQuery("");
    setLines([]);
    setDraft(emptyCatalogLine());
    setTransport("REGULAR");
    setVehicleNo("");
  }

  useEffect(() => {
    if (!open) resetChat();
  }, [open]);

  function parseNumber(value: string, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function pickCustomer(id: string) {
    setCustomerId(id);
    setStep("catalogLine");
    setDraft(emptyCatalogLine());
  }

  function updateDraft(patch: Partial<InvoiceLineDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function handleProductChange(productId: string | null) {
    if (!productId) return;
    const product = products?.find((p) => p.id === productId);
    updateDraft({
      productId,
      rate: product ? Number(product.price) : 0,
      gstRate: product ? Number(product.gstRate) : 18,
    });
  }

  function validateCatalogLine() {
    if (!draft.productId) {
      toast.error("Select a product");
      return false;
    }
    if (draft.quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return false;
    }
    if (draft.rate < 0) {
      toast.error("Enter a valid rate");
      return false;
    }
    return true;
  }

  function validateManualLine() {
    if (!draft.description?.trim()) {
      toast.error("Enter a description");
      return false;
    }
    if (draft.quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return false;
    }
    return true;
  }

  function commitLine() {
    const isManual = step === "manualLine";
    if (isManual ? !validateManualLine() : !validateCatalogLine()) return;
    setLines((prev) => [...prev, { ...draft }]);
    setStep("afterLine");
    setDraft(emptyCatalogLine());
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function lineLabel(line: InvoiceLineDraft) {
    if (line.isManual) return line.description?.trim() || "Manual item";
    const product = products?.find((p) => p.id === line.productId);
    const size =
      line.sizeMm != null && line.sizeMm > 0 ? ` · ${formatPipeSize(line.sizeMm)}` : "";
    return `${product?.name ?? "Product"}${size}`;
  }

  function createBill() {
    if (!customerId || lines.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    createInvoice.mutate(
      buildSalesInvoicePayload(customerId, lines, { transport, vehicleNo }),
      {
        onSuccess: (invoice) => {
          toast.success(`Invoice ${invoice.invoiceNo} created`);
          onOpenChange(false);
          navigate(`/sales/${invoice.id}`);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to create invoice";
          toast.error(message);
        },
      }
    );
  }

  const grandTotal = invoiceGrandTotal(lines);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden rounded-t-2xl p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="sr-only">Quick sales bill</SheetTitle>

        <div className="flex items-center gap-2 border-b px-4 py-3">
          {step !== "customer" && step !== "review" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                if (step === "catalogLine" || step === "manualLine") {
                  setStep(lines.length > 0 ? "afterLine" : "customer");
                } else if (step === "afterLine") {
                  setStep("customer");
                }
              }}
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Quick bill</p>
            <p className="truncate text-xs text-muted-foreground">
              {step === "review"
                ? nextInvoiceNo
                  ? `Invoice ${nextInvoiceNo}`
                  : "Review & create"
                : "Guided sales invoice"}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <BotBubble>Hi — I&apos;ll help you create a sales bill step by step.</BotBubble>

            {selectedCustomer ? (
              <UserBubble>{selectedCustomer.name}</UserBubble>
            ) : null}

            {lines.map((line, index) => (
              <UserBubble key={`${line.productId}-${index}-${line.description}`}>
                {lineLabel(line)} · {line.quantity.toLocaleString("en-IN")} pcs · ₹
                {formatInr(lineAmount(line))}
              </UserBubble>
            ))}

            {step === "customer" ? (
              <>
                <BotBubble>Who is this bill for?</BotBubble>
                <div className="space-y-2 pl-10">
                  <Input
                    placeholder="Search customers…"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border bg-card p-1">
                    {filteredCustomers.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No customers found
                      </p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="flex w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted active:bg-muted/80"
                          onClick={() => pickCustomer(customer.id)}
                        >
                          {customer.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {step === "catalogLine" ? (
              <>
                <BotBubble>Add a product line — pipe stock will be deducted automatically.</BotBubble>
                <div className="space-y-3 rounded-xl border bg-card p-3 pl-10">
                  <div className="space-y-1.5">
                    <Label>Product</Label>
                    <Select
                      value={draft.productId ?? ""}
                      onValueChange={handleProductChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product">
                          {(value: string | null) =>
                            products?.find((p) => p.id === value)?.name ?? "Select product"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Size</Label>
                    <Select
                      value={draft.sizeMm != null ? String(draft.sizeMm) : ""}
                      onValueChange={(value) =>
                        updateDraft({ sizeMm: value ? Number(value) : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional size">
                          {(value: string | null) =>
                            value ? formatPipeSize(Number(value)) : "Optional size"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PIPE_SIZES_MM.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {formatPipeSize(size)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={draft.quantity}
                        onChange={(e) => updateDraft({ quantity: parseNumber(e.target.value, 1) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rate</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={draft.rate}
                        onChange={(e) => updateDraft({ rate: parseNumber(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>GST %</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      value={draft.gstRate}
                      onChange={(e) => updateDraft({ gstRate: parseNumber(e.target.value, 18) })}
                    />
                  </div>
                  <Button type="button" className="w-full" onClick={commitLine}>
                    Add line
                  </Button>
                </div>
              </>
            ) : null}

            {step === "manualLine" ? (
              <>
                <BotBubble>Add a manual line (no stock change — scraps, services, etc.)</BotBubble>
                <div className="space-y-3 rounded-xl border bg-card p-3 pl-10">
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input
                      value={draft.description ?? ""}
                      onChange={(e) => updateDraft({ description: e.target.value })}
                      placeholder="e.g. Scrap, freight"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={draft.quantity}
                        onChange={(e) => updateDraft({ quantity: parseNumber(e.target.value, 1) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rate</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={draft.rate}
                        onChange={(e) => updateDraft({ rate: parseNumber(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button type="button" className="w-full" onClick={commitLine}>
                    Add manual line
                  </Button>
                </div>
              </>
            ) : null}

            {step === "afterLine" ? (
              <>
                <BotBubble>
                  Line added. Add another item, or review the bill when you&apos;re done.
                </BotBubble>
                <div className="flex flex-col gap-2 pl-10">
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setDraft(emptyCatalogLine());
                      setStep("catalogLine");
                    }}
                  >
                    <Plus className="size-4" />
                    Add product line
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setDraft(emptyManualLine());
                      setStep("manualLine");
                    }}
                  >
                    <Plus className="size-4" />
                    Add manual line
                  </Button>
                  <Button
                    type="button"
                    className="justify-start"
                    disabled={lines.length === 0}
                    onClick={() => setStep("review")}
                  >
                    <Check className="size-4" />
                    Review bill ({lines.length} line{lines.length === 1 ? "" : "s"})
                  </Button>
                </div>
              </>
            ) : null}

            {step === "review" ? (
              <>
                <BotBubble>Here&apos;s your bill summary. Create it when ready.</BotBubble>
                <div className="space-y-3 pl-10">
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Bill to
                    </p>
                    <p className="font-semibold">{selectedCustomer?.name}</p>
                  </div>
                  <div className="space-y-2 rounded-xl border bg-card p-3">
                    {lines.map((line, index) => (
                      <div
                        key={`review-${index}`}
                        className="flex items-start justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{lineLabel(line)}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.quantity.toLocaleString("en-IN")} × ₹{formatInr(line.rate)} +{" "}
                            {line.gstRate}% GST
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-sm font-semibold tabular-nums">
                            ₹{formatInr(lineAmount(line))}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => removeLine(index)}
                            aria-label="Remove line"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 text-base font-semibold">
                      <span>Grand total</span>
                      <span className="tabular-nums">₹{formatInr(grandTotal)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Transport</Label>
                      <Input
                        value={transport}
                        onChange={(e) => setTransport(e.target.value)}
                        placeholder="REGULAR"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Vehicle no.</Label>
                      <Input
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {step === "review" ? (
            <div className="border-t bg-background/95 p-4 backdrop-blur-sm">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("afterLine")}
                >
                  Add more
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={createInvoice.isPending || lines.length === 0}
                  onClick={createBill}
                >
                  {createInvoice.isPending ? "Creating…" : "Create invoice"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
