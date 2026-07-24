import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProfitAndLoss, useStockReport } from "./useReports";

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
              <div className="text-2xl font-semibold">{(data?.totalSales ?? 0).toFixed(2)}</div>
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
                {(data?.totalPurchases ?? 0).toFixed(2)}
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
              <div className="text-2xl font-semibold">{(data?.grossProfit ?? 0).toFixed(2)}</div>
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
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
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
                  <TableCell className="text-right">{Number(row.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {Number(row.currentStock).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{row.stockValue.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data && data.rows.length > 0 && (
            <tfoot>
              <TableRow className="font-semibold">
                <TableCell colSpan={5}>Total Stock Value</TableCell>
                <TableCell className="text-right">{data.totalStockValue.toFixed(2)}</TableCell>
              </TableRow>
            </tfoot>
          )}
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
        <TabsList>
          <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
        </TabsList>
        <TabsContent value="pnl">
          <ProfitAndLossTab />
        </TabsContent>
        <TabsContent value="stock">
          <StockReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
