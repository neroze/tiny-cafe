import { storage } from "../storage";
import { api } from "../../shared/routes";

export async function getDashboardStats(range?: 'weekly' | 'monthly' | 'quarterly') {
  return await storage.getDashboardStats(range);
}

export async function getProfit(range?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
  return await storage.getProfit(range);
}

export async function getExportCSV(from: Date, to: Date) {
  const data = await storage.getExportData(from, to);
  let content = "EXECUTIVE SUMMARY\n";
  content += `Report Period,${from.toLocaleDateString()} to ${to.toLocaleDateString()}\n`;
  content += `Total Revenue,NPR ${(data.summary.totalRevenue / 100).toFixed(2)}\n`;
  content += `Total Items Sold,${data.summary.totalItemsSold}\n`;
  content += `Average Order Value,NPR ${(data.summary.averageOrderValue / 100).toFixed(2)}\n`;
  content += `Top Performing Category,${data.summary.topCategory}\n`;
  content += `Total Stock Wastage,${data.summary.wastageTotal} units\n\n`;
  content += "SALES BY ITEM SUMMARY\n";
  content += "Item,Total Quantity,Total Revenue (NPR)\n";
  const itemStats: Record<string, { qty: number; total: number }> = {};
  data.sales.forEach((s) => {
    if (!itemStats[s.item.name]) itemStats[s.item.name] = { qty: 0, total: 0 };
    itemStats[s.item.name].qty += s.quantity;
    itemStats[s.item.name].total += s.total;
  });
  Object.entries(itemStats).forEach(([name, stats]) => {
    content += `"${name}",${stats.qty},${(stats.total / 100).toFixed(2)}\n`;
  });
  content += "\n";
  content += "SALES BY LABEL SUMMARY\n";
  content += "Label,Total Quantity,Total Revenue (NPR)\n";
  const summaryLabelStats: Record<string, { qty: number; total: number }> = {};
  data.sales.forEach((s) => {
    const labels = s.labels || [];
    labels.forEach((l: string) => {
      if (!summaryLabelStats[l]) summaryLabelStats[l] = { qty: 0, total: 0 };
      summaryLabelStats[l].qty += s.quantity;
      summaryLabelStats[l].total += s.total;
    });
  });
  Object.entries(summaryLabelStats).forEach(([label, stats]) => {
    content += `"${label}",${stats.qty},${(stats.total / 100).toFixed(2)}\n`;
  });
  content += "\n";
  content += "DETAILED SALES REPORT\n";
  content += "ID,Date,Item,Category,Quantity,Unit Cost (NPR),Selling Price (NPR),Labels,Total (NPR)\n";
  data.sales.forEach((s) => {
    content += `${s.id},${s.date.toLocaleDateString()},"${s.item.name}",${s.item.category},${s.quantity},${(s.item.costPrice / 100).toFixed(2)},${(s.unitPrice / 100).toFixed(2)},"${(s.labels || []).join(", ")}",${(s.total / 100).toFixed(2)}\n`;
  });
  const filename = `cafe_report_${from.toISOString().split("T")[0]}.csv`;
  return { filename, content };
}

export async function getTargets() {
  const weekly = await storage.getSetting("target_weekly");
  const monthly = await storage.getSetting("target_monthly");
  const quarterly = await storage.getSetting("target_quarterly");
  return {
    weekly: Number(weekly) || 1550000,
    monthly: Number(monthly) || 6670000,
    quarterly: Number(quarterly) || 20000000,
  };
}

export async function updateTargetsFromBody(body: any) {
  const input = api.dashboard.update_targets.input.parse(body);
  await storage.setSetting("target_weekly", input.weekly.toString());
  await storage.setSetting("target_monthly", input.monthly.toString());
  await storage.setSetting("target_quarterly", input.quarterly.toString());
  return { message: "Targets updated successfully" };
}

