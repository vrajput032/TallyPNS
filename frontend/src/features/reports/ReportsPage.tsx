import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePartyOutstanding } from "@/features/payments/usePayments";
import { formatInr } from "@/lib/formatInr";
import {
  useBalanceSheet,
  useProfitAndLoss,
  useStockReport,
  useTrialBalance,
} from "./useReports";

function ProfitAndLossTab() {
  const { data, isLoading } = useProfitAndLoss();

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">{formatInr(data?.totalSales ?? 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                {formatInr(data?.totalPurchases ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">{formatInr(data?.grossProfit ?? 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Based on {data?.salesCount ?? 0} sales invoice(s) and {data?.purchaseCount ?? 0} purchase
        bill(s).
      </p>
    </div>
  );
}

function StockReportTab() {
  const { data, isLoading } = useStockReport();

  return (
    <div className="grid gap-4">
      <div className="min-w-0 rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>HSN</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={6} />
            ) : (data?.rows.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              data?.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.hsn}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell className="text-right">{formatInr(row.price)}</TableCell>
                  <TableCell className="text-right">
                    {Number(row.currentStock).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{formatInr(row.stockValue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data && data.rows.length > 0 && (
            <tfoot>
              <TableRow className="font-semibold">
                <TableCell colSpan={5}>Total Stock Value</TableCell>
                <TableCell className="text-right">{formatInr(data.totalStockValue)}</TableCell>
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}

function BalanceSheetTab() {
  const { data, isLoading } = useBalanceSheet();

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        As on {data ? new Date(data.asOn).toLocaleDateString("en-GB") : "—"}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-md border bg-card">
          <div className="border-b px-4 py-2 font-medium">Liabilities</div>
          <Table>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : (
                data?.liabilities.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{formatInr(row.amount)}</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {formatInr(data?.totalLiabilities ?? 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="min-w-0 rounded-md border bg-card">
          <div className="border-b px-4 py-2 font-medium">Assets</div>
          <Table>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : (
                data?.assets.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{formatInr(row.amount)}</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatInr(data?.totalAssets ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function TrialBalanceTab() {
  const { data, isLoading } = useTrialBalance();

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        As on {data ? new Date(data.asOn).toLocaleDateString("en-GB") : "—"}
      </p>
      <div className="min-w-0 rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Particulars</TableHead>
              <TableHead className="text-right">Debit (₹)</TableHead>
              <TableHead className="text-right">Credit (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={3} rows={8} />
            ) : (
              data?.rows.map((row) => (
                <TableRow key={row.account}>
                  <TableCell>{row.account}</TableCell>
                  <TableCell className="text-right">
                    {row.debit ? formatInr(row.debit) : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.credit ? formatInr(row.credit) : ""}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatInr(data?.totalDebit ?? 0)}</TableCell>
              <TableCell className="text-right">{formatInr(data?.totalCredit ?? 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OutstandingTab() {
  const { data, isLoading } = usePartyOutstanding();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0 rounded-md border bg-card">
        <div className="border-b px-4 py-2 font-medium">Sundry Debtors (Receivable)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={2} />
            ) : (data?.debtors.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No receivables
                </TableCell>
              </TableRow>
            ) : (
              data?.debtors.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right">{formatInr(row.balance)}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatInr(data?.totalDebtors ?? 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="min-w-0 rounded-md border bg-card">
        <div className="border-b px-4 py-2 font-medium">Sundry Creditors (Payable)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={2} />
            ) : (data?.creditors.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No payables
                </TableCell>
              </TableRow>
            ) : (
              data?.creditors.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right">{formatInr(row.balance)}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">
                {formatInr(data?.totalCreditors ?? 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReportsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Reports" backTo="/" backLabel="Back to Dashboard" />

      <Tabs defaultValue="pnl">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
        </TabsList>
        <TabsContent value="pnl">
          <ProfitAndLossTab />
        </TabsContent>
        <TabsContent value="balance-sheet">
          <BalanceSheetTab />
        </TabsContent>
        <TabsContent value="trial-balance">
          <TrialBalanceTab />
        </TabsContent>
        <TabsContent value="outstanding">
          <OutstandingTab />
        </TabsContent>
        <TabsContent value="stock">
          <StockReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
