import { useDashboardStats } from "@/hooks/use-dashboard";
import { Layout } from "@/components/layout";
import { StatsCard } from "@/components/stats-card";
import { DollarSign, Calendar, TrendingUp, Award, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui-components";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const [range, setRange] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const { data: stats, isLoading } = useDashboardStats(range);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (val: number) => `NPR ${(val / 100).toLocaleString()}`;

  // Use a fallback if stats aren't loaded properly
  const safeStats = stats || {
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    quarterlySales: 0,
    topItems: [],
    itemSalesTrend: []
  };

  const chartData = safeStats.topItems.map(item => ({
    name: item.name,
    sales: item.quantity,
    total: item.total / 100
  }));

  const trendData = safeStats.itemSalesTrend.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ...Object.fromEntries(
      Object.entries(t.items).map(([name, total]) => [name, total / 100])
    )
  }));

  const itemNames = Array.from(new Set(safeStats.itemSalesTrend.flatMap(t => Object.keys(t.items))));

  const colors = ['#d4a373', '#ccd5ae', '#e9edc9', '#faedcd', '#d6ccc2', '#e76f51', '#264653', '#2a9d8f', '#e9c46a', '#f4a261'];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-display font-bold text-foreground">Good Morning!</h1>
        <p className="text-muted-foreground mt-2 text-lg">Here's what's happening at the café today.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Today's Sales"
          value={formatCurrency(safeStats.dailySales)}
          icon={DollarSign}
          trend="+12%"
          trendUp={true}
        />
        <StatsCard
          title="Weekly Sales"
          value={formatCurrency(safeStats.weeklySales)}
          icon={Calendar}
          target={1550000} // Target in cents
          current={safeStats.weeklySales}
          description="NPR 15,500"
        />
        <StatsCard
          title="Monthly Sales"
          value={formatCurrency(safeStats.monthlySales)}
          icon={TrendingUp}
          target={6670000} // Target in cents
          current={safeStats.monthlySales}
          description="NPR 66,700"
          colorClass="text-accent"
        />
        <StatsCard
          title="Quarterly Sales"
          value={formatCurrency(safeStats.quarterlySales)}
          icon={Award}
          target={20000000} // Target in cents
          current={safeStats.quarterlySales}
          description="NPR 200,000"
          colorClass="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold font-display">Sales Trend by Item</h2>
              <p className="text-sm text-muted-foreground">Detailed performance tracking per item</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Range:</span>
              <Select value={range} onValueChange={(v: any) => setRange(v)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `NPR ${val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid hsl(var(--border))', 
                    backgroundColor: 'hsl(var(--background))',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
                {itemNames.map((name, index) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={colors[index % colors.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-display">Top Selling Items</h2>
              <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                View Report <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Item Name</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Qty Sold</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {safeStats.topItems.map((item, i) => (
                    <motion.tr 
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group hover:bg-secondary/20 transition-colors"
                    >
                      <td className="py-4 font-medium text-foreground">{item.name}</td>
                      <td className="py-4 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="py-4 text-right font-bold font-mono text-primary">
                        {formatCurrency(item.total)}
                      </td>
                    </motion.tr>
                  ))}
                  {safeStats.topItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        No sales data yet. Start selling!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <h2 className="text-xl font-bold font-display mb-6">Sales Distribution</h2>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
