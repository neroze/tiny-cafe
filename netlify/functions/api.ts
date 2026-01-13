import type { Handler } from "@netlify/functions";
import { storage } from "../../server/storage";
import { api } from "../../shared/routes";
import { z } from "zod";

function json(statusCode: number, data: any) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function csv(statusCode: number, filename: string, content: string) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
    body: content,
  };
}

function parseBody(event: any) {
  if (!event.body) return {};
  const raw =
    event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizePath(path: string) {
  if (path.startsWith("/.netlify/functions/api")) {
    return path.replace("/.netlify/functions/api", "");
  }
  return path;
}

export const handler: Handler = async (event) => {
  try {
    const method = event.httpMethod.toUpperCase();
    const qp = event.queryStringParameters || {};
    const body = parseBody(event);
    const path = normalizePath(event.path);

    if (method === "GET" && path === api.items.list.path) {
      const items = await storage.getItems();
      return json(200, items);
    }

    if (method === "GET" && path.startsWith("/api/items/")) {
      const idStr = path.split("/").pop();
      const id = Number(idStr);
      const item = await storage.getItem(id);
      if (!item) return json(404, { message: "Item not found" });
      return json(200, item);
    }

    if (method === "POST" && path === api.items.create.path) {
      try {
        const input = api.items.create.input.parse(body);
        const item = await storage.createItem(input);
        return json(201, item);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.errors[0].message });
        }
        throw err;
      }
    }

    if (method === "PUT" && path.startsWith("/api/items/")) {
      try {
        const idStr = path.split("/").pop();
        const id = Number(idStr);
        const input = api.items.update.input.parse(body);
        const item = await storage.updateItem(id, input);
        return json(200, item);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        return json(404, { message: "Item not found" });
      }
    }

    if (method === "DELETE" && path.startsWith("/api/items/")) {
      const idStr = path.split("/").pop();
      const id = Number(idStr);
      await storage.deleteItem(id);
      return { statusCode: 204, body: "" };
    }

    if (method === "GET" && path === api.sales.list.path) {
      const date = qp.date ? new Date(qp.date) : undefined;
      const limit = qp.limit ? Number(qp.limit) : 50;
      const sales = await storage.getSales(date, limit);
      return json(200, sales);
    }

    if (method === "POST" && path === api.sales.create.path) {
      try {
        const rawData = { ...body };
        const itemId = Number(rawData.itemId);
        const quantity = Number(rawData.quantity);
        const unitPrice = Number(rawData.unitPrice);
        const total = Number(rawData.total);
        let date: Date;
        if (rawData.date) {
          date = new Date(rawData.date);
          if (isNaN(date.getTime())) date = new Date();
        } else {
          date = new Date();
        }
        const input = api.sales.create.input.parse({
          ...rawData,
          itemId,
          quantity,
          unitPrice,
          total,
          date,
          labels: rawData.labels || [],
        });
        const sale = await storage.createSale(input);
        return json(201, sale);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, {
            message:
              "Validation error: " +
              err.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", "),
          });
        }
        return json(500, { message: "Internal server error" });
      }
    }

    if (method === "GET" && path === api.stock.list.path) {
      const date = qp.date ? new Date(qp.date) : new Date();
      const stocks = await storage.getStock(date);
      return json(200, stocks);
    }

    if (method === "POST" && path === api.stock.transaction.path) {
      try {
        const input = api.stock.transaction.input.parse({
          ...body,
          itemId: Number(body.itemId),
          quantity: Number(body.quantity),
        });
        const stock = await storage.recordStockTransaction(input);
        return json(200, stock);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        throw err;
      }
    }

    if (method === "GET" && path === api.dashboard.stats.path) {
      const range = (qp.range as any) || undefined;
      const stats = await storage.getDashboardStats(range);
      return json(200, stats);
    }

    if (method === "GET" && path === api.dashboard.export.path) {
      try {
        const from = qp.from ? new Date(qp.from) : new Date();
        const to = qp.to ? new Date(qp.to) : new Date();
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
        return csv(200, filename, content);
      } catch {
        return json(500, { message: "Failed to generate report" });
      }
    }

    if (method === "GET" && path === api.dashboard.get_targets.path) {
      const weekly = await storage.getSetting("target_weekly");
      const monthly = await storage.getSetting("target_monthly");
      const quarterly = await storage.getSetting("target_quarterly");
      return json(200, {
        weekly: Number(weekly) || 1550000,
        monthly: Number(monthly) || 6670000,
        quarterly: Number(quarterly) || 20000000,
      });
    }

    if (method === "POST" && path === api.dashboard.update_targets.path) {
      try {
        const input = api.dashboard.update_targets.input.parse(body);
        await storage.setSetting("target_weekly", input.weekly.toString());
        await storage.setSetting("target_monthly", input.monthly.toString());
        await storage.setSetting("target_quarterly", input.quarterly.toString());
        return json(200, { message: "Targets updated successfully" });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        return json(500, { message: "Failed to update targets" });
      }
    }

    if (method === "GET" && path === api.dashboard.labels.path) {
      const configuredLabels = await storage.getSetting("configured_labels");
      const labels = configuredLabels ? JSON.parse(configuredLabels) : [];
      const uniqueLabels = await storage.getUniqueLabels();
      const merged = Array.from(new Set([...(labels as string[]), ...uniqueLabels]));
      return json(200, merged);
    }

    if (method === "GET" && path === "/api/config/labels") {
      const labelsStr = await storage.getSetting("configured_labels");
      return json(200, labelsStr ? JSON.parse(labelsStr) : []);
    }

    if (method === "POST" && path === "/api/config/labels") {
      const label = body.label;
      if (!label) return json(400, { message: "Label required" });
      const labelsStr = await storage.getSetting("configured_labels");
      let labels = labelsStr ? JSON.parse(labelsStr) : [];
      if (!labels.includes(label)) {
        labels.push(label);
        await storage.setSetting("configured_labels", JSON.stringify(labels));
      }
      return json(200, labels);
    }

    if (method === "DELETE" && path === "/api/config/labels") {
      const label = body.label;
      const labelsStr = await storage.getSetting("configured_labels");
      let labels = labelsStr ? JSON.parse(labelsStr) : [];
      labels = labels.filter((l: string) => l !== label);
      await storage.setSetting("configured_labels", JSON.stringify(labels));
      return json(200, labels);
    }

    if (method === "GET" && path === "/api/config/categories") {
      const catsStr = await storage.getSetting("configured_categories");
      return json(200, catsStr ? JSON.parse(catsStr) : ["Snacks", "Drinks", "Main"]);
    }

    if (method === "POST" && path === "/api/config/categories") {
      const category = body.category;
      if (!category) return json(400, { message: "Category required" });
      const catsStr = await storage.getSetting("configured_categories");
      let cats = catsStr ? JSON.parse(catsStr) : ["Snacks", "Drinks", "Main"];
      if (!cats.includes(category)) {
        cats.push(category);
        await storage.setSetting("configured_categories", JSON.stringify(cats));
      }
      return json(200, cats);
    }

    if (method === "DELETE" && path === "/api/config/categories") {
      const category = body.category;
      const catsStr = await storage.getSetting("configured_categories");
      let cats = catsStr ? JSON.parse(catsStr) : ["Snacks", "Drinks", "Main"];
      cats = cats.filter((c: string) => c !== category);
      await storage.setSetting("configured_categories", JSON.stringify(cats));
      return json(200, cats);
    }

    return json(404, { message: "Not found" });
  } catch (err: any) {
    return json(500, { message: err?.message || "Internal Server Error" });
  }
};

