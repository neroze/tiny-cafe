import * as React from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Loader2 } from "lucide-react";

export default function RevenueByItemPage() {
  return (
    <Layout>
      <Card className="p-6">
        <h1 className="text-2xl font-bold font-display mb-4">Revenue Reports</h1>
        <RevenueReportsPageContent />
      </Card>
    </Layout>
  );
}

function RevenueReportsPageContent() {
  const [from, setFrom] = React.useState<string>(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [to, setTo] = React.useState<string>(() => new Date().toISOString().split("T")[0]);
  const [sort, setSort] = React.useState<'asc'|'desc'>('desc');

  const { data: itemsData = [], isLoading: itemsLoading } = useQuery({
    queryKey: [api.reports.revenue_by_item.path, from, to, sort],
    queryFn: async () => {
      const url = `${api.reports.revenue_by_item.path}?from=${from}&to=${to}&sort=${sort}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch report");
      return api.reports.revenue_by_item.responses[200].parse(await res.json());
    },
  });

  const summary = useQuery({
    queryKey: [api.reports.revenue_summary.path, from, to],
    queryFn: async () => {
      const url = `${api.reports.revenue_summary.path}?from=${from}&to=${to}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch revenue summary');
      return api.reports.revenue_summary.responses[200].parse(await res.json());
    }
  });

  const byPayment = useQuery({
    queryKey: [api.reports.revenue_by_payment.path, from, to],
    queryFn: async () => {
      const url = `${api.reports.revenue_by_payment.path}?from=${from}&to=${to}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payment revenue');
      return api.reports.revenue_by_payment.responses[200].parse(await res.json());
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-sm">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[180px]" />
        </div>
        <div>
          <Label className="text-sm">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[180px]" />
        </div>
        <div>
          <Label className="text-sm">Sort</Label>
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Revenue Desc</SelectItem>
              <SelectItem value="asc">Revenue Asc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(itemsLoading || summary.isLoading || byPayment.isLoading) ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4">
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-xl font-bold">{`NPR ${Number(summary.data?.totalRevenue || 0).toLocaleString()}`}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-sm text-muted-foreground">Cash Received</div>
              <div className="text-xl font-bold">{`NPR ${Number(summary.data?.cashReceived || 0).toLocaleString()}`}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-sm text-muted-foreground">Card Received</div>
              <div className="text-xl font-bold">{`NPR ${Number(summary.data?.cardReceived || 0).toLocaleString()}`}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-sm text-muted-foreground">Credit Sales</div>
              <div className="text-xl font-bold">{`NPR ${Number(summary.data?.creditSales || 0).toLocaleString()}`}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <h2 className="text-lg font-bold mb-2">Revenue by Payment Type</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Payment Method</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(byPayment.data || []).map((row: any) => (
                  <tr key={row.method} className="border-b">
                    <td className="py-2">{row.method}</td>
                    <td className="py-2 text-right">{`NPR ${Number(row.revenue).toLocaleString()}`}</td>
                  </tr>
                ))}
                {(byPayment.data || []).length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-muted-foreground">No sales in selected range</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <h2 className="text-lg font-bold mb-2">Revenue by Menu Item</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Menu Item</th>
                  <th className="py-2 text-right">Quantity Sold</th>
                  <th className="py-2 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {itemsData.map((row) => (
                  <tr key={row.itemId} className="border-b">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 text-right">{Number(row.quantity).toLocaleString()}</td>
                    <td className="py-2 text-right">{`NPR ${Number(row.revenue).toLocaleString()}`}</td>
                  </tr>
                ))}
                {itemsData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">No sales in selected range</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
