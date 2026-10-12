import { ChevronDownIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  activeSalesFilterCount,
  ANY_DUE_LABEL,
  DUE_FILTER_OPTIONS,
  dueFilterLabel,
  EMPTY_SALES_FILTERS,
  STATUS_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  type SalesDueOption,
  type SalesFilters,
} from "./salesFilters";

const ALL_CUSTOMERS = "all";

function DueFilterMenu({
  value,
  onChange,
}: {
  value: SalesDueOption[];
  onChange: (value: SalesDueOption[]) => void;
}) {
  function toggle(option: SalesDueOption, checked: boolean) {
    const next = new Set(value);
    if (checked) next.add(option);
    else next.delete(option);
    onChange(DUE_FILTER_OPTIONS.map((o) => o.value).filter((v) => next.has(v)));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Due date"
            className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
          />
        }
      >
        <span className="truncate">{dueFilterLabel(value)}</span>
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuCheckboxItem checked={value.length === 0} onCheckedChange={() => onChange([])}>
          {ANY_DUE_LABEL}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {DUE_FILTER_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value.includes(option.value)}
            onCheckedChange={(checked) => toggle(option.value, checked)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const match = options.find((option) => option.value === next);
        if (match) onChange(match.value);
      }}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue>
          {(current: string | null) =>
            options.find((option) => option.value === current)?.label ?? options[0]?.label
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SalesFiltersBar({
  filters,
  customers,
  onChange,
  compact,
}: {
  filters: SalesFilters;
  customers: { id: string; name: string }[];
  onChange: (filters: SalesFilters) => void;
  compact: boolean;
}) {
  const customerOptions = [
    { value: ALL_CUSTOMERS, label: "All customers" },
    ...customers.map((customer) => ({ value: customer.id, label: customer.name })),
  ];
  const update = (patch: Partial<SalesFilters>) => onChange({ ...filters, ...patch });

  return (
    <div
      className={cn(
        "min-w-0 gap-2",
        compact ? "grid grid-cols-2 rounded-xl border bg-card p-3" : "flex flex-wrap items-center"
      )}
    >
      <div className={cn("relative min-w-0", compact ? "col-span-2" : "w-64")}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search invoice, customer, vehicle"
          className="pl-8"
          aria-label="Search invoices"
        />
      </div>
      <div className={cn("min-w-0", compact ? "col-span-2" : "w-56")}>
        <FilterSelect
          ariaLabel="Customer"
          value={filters.customerId || ALL_CUSTOMERS}
          options={customerOptions}
          onChange={(value) => update({ customerId: value === ALL_CUSTOMERS ? "" : value })}
        />
      </div>
      <div className={cn("min-w-0", !compact && "w-52")}>
        <FilterSelect
          ariaLabel="Payment status"
          value={filters.status}
          options={STATUS_FILTER_OPTIONS}
          onChange={(status) => update({ status })}
        />
      </div>
      <div className={cn("min-w-0", !compact && "w-44")}>
        <FilterSelect
          ariaLabel="Invoice type"
          value={filters.type}
          options={TYPE_FILTER_OPTIONS}
          onChange={(type) => update({ type })}
        />
      </div>
      <div className={cn("min-w-0", !compact && "w-52")}>
        <DueFilterMenu value={filters.due} onChange={(due) => update({ due })} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "default" : "sm"}
        disabled={activeSalesFilterCount(filters) === 0}
        onClick={() => onChange(EMPTY_SALES_FILTERS)}
      >
        <X className="size-4" />
        Clear
      </Button>
    </div>
  );
}
