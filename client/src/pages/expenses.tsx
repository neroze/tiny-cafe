import * as React from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui-components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { format } from "date-fns";

export default function ExpensesPage() {
  const [from, setFrom] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [to, setTo] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const { data } = useExpenses({ from, to });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [form, setForm] = React.useState({
    date: new Date(),
    category: "Misc",
    description: "",
    amount: 0,
    isRecurring: false,
    frequency: "daily" as "daily" | "monthly" | "yearly",
  });

  const formatCurrency = (val: number) => `NPR ${(val / 100).toLocaleString()}`;

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold font-display mb-4">Add Expense</h2>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">Date</Label>
                <Input
                  type="date"
                  value={form.date.toISOString().split("T")[0]}
                  onChange={(e) => setForm({ ...form, date: new Date(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">Category</Label>
                <Select value={form.category} onValueChange={(v: any) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Rent","Salary","Utilities","Supplies","Maintenance","Misc"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">Amount (NPR)</Label>
                <Input
                  type="number"
                  value={(form.amount / 100).toString()}
                  onChange={(e) => setForm({ ...form, amount: Math.round(Number(e.target.value) * 100) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">Type</Label>
                <Select value={form.isRecurring ? "recurring" : "one"} onValueChange={(v: any) => setForm({ ...form, isRecurring: v === "recurring" })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.isRecurring && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-sm">Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v: any) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => createExpense.mutate(form as any)}
                  disabled={createExpense.isPending}
                >
                  Save Expense
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold font-display mb-4">Expenses</h2>
            <div className="flex gap-2 mb-4">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="mb-4 text-sm text-muted-foreground">
              Total: {formatCurrency(data?.total || 0)}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Category</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.items || []).map((e: any) => (
                    <tr key={e.id} className="hover:bg-secondary/20">
                      <td className="py-3">{format(new Date(e.date), "LLL dd, y")}</td>
                      <td className="py-3">{e.category}</td>
                      <td className="py-3">{e.description}</td>
                      <td className="py-3 text-right font-mono">
                        {formatCurrency(e.allocatedDaily ? e.allocatedDaily : e.amount)}
                      </td>
                    </tr>
                  ))}
                  {(data?.items || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No expenses for selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

