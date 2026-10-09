import { daysUntilDue, type SalesInvoice } from "./types";

export type SalesStatusFilter = "all" | "unpaid" | "PENDING" | "PARTIAL" | "PAID";
export type SalesTypeFilter = "all" | "factory" | "trading" | "raw-material";
export type SalesDueFilter = "all" | "overdue" | "week";

export type SalesFilters = {
  q: string;
  customerId: string;
  status: SalesStatusFilter;
  type: SalesTypeFilter;
  due: SalesDueFilter;
};

export const EMPTY_SALES_FILTERS: SalesFilters = {
  q: "",
  customerId: "",
  status: "all",
  type: "all",
  due: "all",
};

export const STATUS_FILTER_OPTIONS: { value: SalesStatusFilter; label: string }[] = [
  { value: "all", label: "All payments" },
  { value: "unpaid", label: "Unpaid (pending + partial)" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
];

export const TYPE_FILTER_OPTIONS: { value: SalesTypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "factory", label: "Factory only" },
  { value: "trading", label: "Trading only" },
  { value: "raw-material", label: "Raw material trading only" },
];

export const DUE_FILTER_OPTIONS: { value: SalesDueFilter; label: string }[] = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "week", label: "Due in 7 days" },
];

function pick<T extends string>(options: { value: T }[], raw: string | null, fallback: T): T {
  return options.find((option) => option.value === raw)?.value ?? fallback;
}

export function parseSalesFilters(search: URLSearchParams): SalesFilters {
  return {
    q: search.get("q") ?? "",
    customerId: search.get("customer") ?? "",
    status: pick(STATUS_FILTER_OPTIONS, search.get("status"), "all"),
    type: pick(TYPE_FILTER_OPTIONS, search.get("type"), "all"),
    due: pick(DUE_FILTER_OPTIONS, search.get("due"), "all"),
  };
}

/** Writes non-default filters onto `search` (other params are kept). */
export function writeSalesFilters(search: URLSearchParams, filters: SalesFilters): URLSearchParams {
  const next = new URLSearchParams(search);
  const entries: [string, string, string][] = [
    ["q", filters.q.trim(), ""],
    ["customer", filters.customerId, ""],
    ["status", filters.status, "all"],
    ["type", filters.type, "all"],
    ["due", filters.due, "all"],
  ];
  for (const [key, value, fallback] of entries) {
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

const SALES_LIST_KEYS = ["q", "customer", "status", "type", "due"] as const;

export type SalesListView = "month" | "all";

export function salesListView(search: URLSearchParams): SalesListView {
  return search.get("view") === "all" ? "all" : "month";
}

/** Filter params plus Month/All, for `/sales` and for pages that return there. */
export function salesListSearch(search: URLSearchParams): string {
  const next = new URLSearchParams();
  for (const key of SALES_LIST_KEYS) {
    const value = search.get(key);
    if (value) next.set(key, value);
  }
  if (search.get("view") === "all") next.set("view", "all");
  const query = next.toString();
  return query ? `?${query}` : "";
}

export function salesListPath(search: URLSearchParams): string {
  return `/sales${salesListSearch(search)}`;
}

export function salesInvoicePath(id: string, search: URLSearchParams): string {
  return `/sales/${id}${salesListSearch(search)}`;
}

export function salesInvoiceEditPath(id: string, search: URLSearchParams): string {
  return `/sales/${id}/edit${salesListSearch(search)}`;
}

/** Mobile back from a sales page keeps the list filters carried on this URL. */
export function salesBackTarget(
  backTo: string | undefined,
  pathname: string,
  search: string
): string | undefined {
  if (!backTo || !pathname.startsWith("/sales")) return backTo;
  const listSearch = salesListSearch(new URLSearchParams(search));
  if (!listSearch) return backTo;
  const path = backTo.split("?")[0] ?? backTo;
  if (path === "/sales" || /^\/sales\/[^/]+$/.test(path)) return `${path}${listSearch}`;
  return backTo;
}

/** Keeps list filters and switches to All while any filter is on. */
export function writeSalesListState(
  search: URLSearchParams,
  filters: SalesFilters,
  view: SalesListView
): URLSearchParams {
  const next = writeSalesFilters(search, filters);
  const listView = activeSalesFilterCount(filters) > 0 ? "all" : view;
  if (listView === "all") next.set("view", "all");
  else next.delete("view");
  return next;
}

export function activeSalesFilterCount(filters: SalesFilters): number {
  return [
    filters.q.trim() !== "",
    filters.customerId !== "",
    filters.status !== "all",
    filters.type !== "all",
    filters.due !== "all",
  ].filter(Boolean).length;
}

function matchesStatus(invoice: SalesInvoice, status: SalesStatusFilter): boolean {
  const value = invoice.paymentStatus ?? "PENDING";
  switch (status) {
    case "all":
      return true;
    case "unpaid":
      return value !== "PAID";
    case "PENDING":
    case "PARTIAL":
    case "PAID":
      return value === status;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function matchesType(invoice: SalesInvoice, type: SalesTypeFilter): boolean {
  switch (type) {
    case "all":
      return true;
    case "factory":
      return !invoice.isTrading && !invoice.isRawMaterialTrading;
    case "trading":
      return invoice.isTrading;
    case "raw-material":
      return invoice.isRawMaterialTrading;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function matchesDue(invoice: SalesInvoice, due: SalesDueFilter): boolean {
  if (due === "all") return true;
  if ((invoice.balanceAmount ?? 0) <= 0) return false;
  const days = daysUntilDue(invoice);
  if (days === null) return false;
  switch (due) {
    case "overdue":
      return days < 0;
    case "week":
      return days >= 0 && days <= 7;
    default: {
      const _exhaustive: never = due;
      return _exhaustive;
    }
  }
}

function matchesSearch(invoice: SalesInvoice, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [invoice.invoiceNo, invoice.customer.name, invoice.vehicleNo ?? ""].some((value) =>
    value.toLowerCase().includes(needle)
  );
}

export function applySalesFilters(invoices: SalesInvoice[], filters: SalesFilters): SalesInvoice[] {
  return invoices.filter(
    (invoice) =>
      (!filters.customerId || invoice.customerId === filters.customerId) &&
      matchesStatus(invoice, filters.status) &&
      matchesType(invoice, filters.type) &&
      matchesDue(invoice, filters.due) &&
      matchesSearch(invoice, filters.q)
  );
}

/** Customers that appear on at least one invoice, sorted by name. */
export function invoiceCustomers(invoices: SalesInvoice[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const invoice of invoices) byId.set(invoice.customerId, invoice.customer.name);
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Short text for headers and PDFs, e.g. "Sharma Traders · Unpaid · Trading only". */
export function describeSalesFilters(filters: SalesFilters, customerName?: string): string {
  const label = <T extends string>(options: { value: T; label: string }[], value: T) =>
    options.find((option) => option.value === value)?.label ?? value;
  const parts: string[] = [];
  if (filters.customerId) parts.push(customerName ?? "One customer");
  if (filters.status === "unpaid") parts.push("Unpaid");
  else if (filters.status !== "all") parts.push(label(STATUS_FILTER_OPTIONS, filters.status));
  if (filters.type !== "all") parts.push(label(TYPE_FILTER_OPTIONS, filters.type));
  if (filters.due !== "all") parts.push(label(DUE_FILTER_OPTIONS, filters.due));
  if (filters.q.trim()) parts.push(`“${filters.q.trim()}”`);
  return parts.join(" · ");
}
