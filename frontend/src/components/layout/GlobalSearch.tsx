import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatInr } from "@/lib/formatInr";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCustomers } from "@/store/slices/customersSlice";
import { fetchProducts } from "@/store/slices/productsSlice";
import { fetchPurchaseBills } from "@/store/slices/purchaseSlice";
import { fetchRawMaterialBills } from "@/store/slices/rawMaterialSlice";
import { fetchSalesInvoices } from "@/store/slices/salesSlice";
import { purchaseBillTitle } from "@/features/purchase/types";

type Hit = {
  id: string;
  group: string;
  title: string;
  detail: string;
  to: string;
};

const LIMIT_PER_GROUP = 5;

function has(value: string | null | undefined, needle: string) {
  return (value ?? "").toLowerCase().includes(needle);
}

export function GlobalSearch({
  shortcut = false,
  className,
  showHint = false,
}: {
  shortcut?: boolean;
  className?: string;
  showHint?: boolean;
}) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const sales = useAppSelector((state) => state.sales.list);
  const purchase = useAppSelector((state) => state.purchase.list);
  const rawMaterial = useAppSelector((state) => state.rawMaterial.list);
  const customers = useAppSelector((state) => state.customers);
  const products = useAppSelector((state) => state.products);

  useEffect(() => {
    if (!open) return;
    const silent = { silent: true } as const;
    if (sales.status === "idle") dispatch(fetchSalesInvoices(silent));
    if (purchase.status === "idle") dispatch(fetchPurchaseBills(silent));
    if (rawMaterial.status === "idle") dispatch(fetchRawMaterialBills(silent));
    if (customers.status === "idle") dispatch(fetchCustomers(silent));
    if (products.status === "idle") dispatch(fetchProducts(silent));
  }, [
    open,
    dispatch,
    sales.status,
    purchase.status,
    rawMaterial.status,
    customers.status,
    products.status,
  ]);

  useEffect(() => {
    if (!shortcut) return;
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    const found: Hit[] = [];

    const salesHits = sales.items
      .filter((invoice) => !invoice.deletedAt)
      .filter((invoice) =>
        [invoice.invoiceNo, invoice.customer?.name, invoice.vehicleNo].some((value) => has(value, needle)),
      )
      .slice(0, LIMIT_PER_GROUP)
      .map((invoice) => ({
        id: `sales-${invoice.id}`,
        group: "Sales",
        title: invoice.invoiceNo,
        detail: `${invoice.customer?.name ?? "Customer"} · ${formatInr(Number(invoice.totalAmount))}`,
        to: `/sales/${invoice.id}`,
      }));

    const purchaseHits = purchase.items
      .filter((bill) => !bill.deletedAt)
      .filter((bill) =>
        [bill.billNo, bill.supplierInvoiceNo, bill.title, bill.vendor?.name, bill.vehicleNo].some((value) =>
          has(value, needle),
        ),
      )
      .slice(0, LIMIT_PER_GROUP)
      .map((bill) => ({
        id: `purchase-${bill.id}`,
        group: "Purchase",
        title: purchaseBillTitle(bill),
        detail: `${bill.vendor?.name ?? bill.billNo} · ${formatInr(Number(bill.totalAmount))}`,
        to: `/purchase/${bill.id}`,
      }));

    const rawHits = rawMaterial.items
      .filter((bill) =>
        [bill.billNo, bill.supplierName, bill.vehicleNo, bill.supplierGstin].some((value) => has(value, needle)),
      )
      .slice(0, LIMIT_PER_GROUP)
      .map((bill) => ({
        id: `raw-${bill.id}`,
        group: "Raw material",
        title: bill.billNo,
        detail: `${bill.supplierName} · ${formatInr(Number(bill.totalAmount))}`,
        to: `/raw-material/${bill.id}`,
      }));

    const customerHits = customers.items
      .filter((customer) => [customer.name, customer.phone, customer.gstin].some((value) => has(value, needle)))
      .slice(0, LIMIT_PER_GROUP)
      .map((customer) => ({
        id: `customer-${customer.id}`,
        group: "Customers",
        title: customer.name,
        detail: customer.phone || customer.gstin || "Customer",
        to: `/ledger/${customer.id}`,
      }));

    const productHits = products.items
      .filter((product) => [product.name, product.hsn].some((value) => has(value, needle)))
      .slice(0, LIMIT_PER_GROUP)
      .map((product) => ({
        id: `product-${product.id}`,
        group: "Products",
        title: product.name,
        detail: product.hsn ? `HSN ${product.hsn}` : "Product",
        to: `/products?q=${encodeURIComponent(product.name)}`,
      }));

    found.push(...salesHits, ...purchaseHits, ...rawHits, ...customerHits, ...productHits);
    return found;
  }, [query, sales.items, purchase.items, rawMaterial.items, customers.items, products.items]);

  const loading =
    query.trim().length >= 2 &&
    hits.length === 0 &&
    [sales, purchase, rawMaterial, customers, products].some(
      (list) => list.status === "loading" || list.status === "idle",
    );

  function openHit(hit: Hit) {
    setOpen(false);
    setQuery("");
    navigate(hit.to);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <label className="flex h-9 items-center gap-2 rounded-full border border-border bg-card/80 px-3 text-sm text-muted-foreground shadow-sm">
        <Search className="size-4 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={showHint ? "Search by invoice, PO, customer, product..." : "Search invoices, POs, customers..."}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
            if (event.key === "Enter" && hits[0]) {
              event.preventDefault();
              openHit(hits[0]);
            }
          }}
        />
        {showHint ? (
          <span className="shrink-0 rounded-md border border-border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </span>
        ) : null}
      </label>
      {open && query.trim().length >= 2 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-50 max-h-80 overflow-y-auto rounded-xl border border-border bg-card py-1 text-left shadow-lg"
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
          ) : (
            hits.map((hit, index) => {
              const showGroup = index === 0 || hits[index - 1].group !== hit.group;
              return (
                <div key={hit.id}>
                  {showGroup ? (
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {hit.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-muted"
                    onClick={() => openHit(hit)}
                  >
                    <span className="truncate text-sm font-medium text-foreground">{hit.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{hit.detail}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
