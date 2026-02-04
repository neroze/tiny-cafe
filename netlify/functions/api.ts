import type { Handler } from "@netlify/functions";
import { listExpensesByQuery, createExpenseFromBody, updateExpenseFromBody, deleteExpenseById, getExpenseCategories, addExpenseCategory, removeExpenseCategory } from "../../server/services/expenseService";
import { api } from "../../shared/routes";
import { z } from "zod";
import { listItems, getItemById, createItemFromBody, updateItemFromBody, deleteItemById } from "../../server/services/itemService";
import { listSalesByQuery, createSaleFromBody } from "../../server/services/salesService";
import { listStock, recordStockTransactionFromBody } from "../../server/services/stockService";
import { getDashboardStats, getProfit, getExportCSV, getTargets, updateTargetsFromBody } from "../../server/services/dashboardService";
import { getMergedLabels, getConfiguredLabels, addLabel, removeLabel, getConfiguredCategories, addCategory, removeCategory } from "../../server/services/configService";
import { getRecipeByMenuItem, upsertRecipeFromBody, deleteRecipeForMenuItem } from "../../server/services/recipeService";
import { storage } from "../../server/storage";

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

    const extractOrderId = (p: string) => {
      const m = p.match(/\/orders\/(\d+)(?:\/(items|close))?/);
      return m && m[1] ? Number(m[1]) : NaN;
    };

    if (method === "GET" && path === api.expenses.list.path) {
      const result = await listExpensesByQuery({ from: qp.from, to: qp.to });
      return json(200, result);
    }

    if (method === "POST" && path === api.expenses.create.path) {
      try {
        const exp = await createExpenseFromBody(body);
        return json(201, exp);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        throw err;
      }
    }

    if (method === "PUT" && path.startsWith("/api/expenses/")) {
      try {
        const idStr = path.split("/").pop();
        const id = Number(idStr);
        const exp = await updateExpenseFromBody(id, body);
        return json(200, exp);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        return json(404, { message: "Expense not found" });
      }
    }

    if (method === "DELETE" && path.startsWith("/api/expenses/")) {
      const idStr = path.split("/").pop();
      const id = Number(idStr);
      await deleteExpenseById(id);
      return { statusCode: 204, body: "" };
    }

    if (method === "GET" && path === api.items.list.path) {
      const items = await listItems();
      return json(200, items);
    }

    if (method === "GET" && path.startsWith("/api/items/")) {
      const idStr = path.split("/").pop();
      const id = Number(idStr);
      const item = await getItemById(id);
      if (!item) return json(404, { message: "Item not found" });
      return json(200, item);
    }

    if (method === "POST" && path === api.items.create.path) {
      try {
        const item = await createItemFromBody(body);
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
        const item = await updateItemFromBody(id, body);
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
      await deleteItemById(id);
      return { statusCode: 204, body: "" };
    }

    if (method === "GET" && path === api.sales.list.path) {
      const sales = await listSalesByQuery({ date: qp.date, from: qp.from, to: qp.to, limit: qp.limit });
      return json(200, sales);
    }
    
    if (method === "PUT" && path.startsWith("/api/sales/")) {
      try {
        const idStr = path.split("/").pop();
        const id = Number(idStr);
        const sale = await (await import("../../server/services/salesService")).updateSaleFromBody(id, body);
        return json(200, sale);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        return json(404, { message: "Sale not found" });
      }
    }

    if (method === "POST" && path === api.sales.create.path) {
      try {
        const sale = await createSaleFromBody(body);
        return json(201, sale);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, {
            message:
              "Validation error: " +
              err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
          });
        }
        return json(500, { message: "Internal server error" });
      }
    }

    if (method === "GET" && path === api.stock.list.path) {
      const date = qp.date ? new Date(qp.date) : new Date();
      const stocks = await listStock(date);
      return json(200, stocks);
    }

    if (method === "POST" && path === api.stock.transaction.path) {
      try {
        const stock = await recordStockTransactionFromBody(body);
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
      const stats = await getDashboardStats(range);
      return json(200, stats);
    }

    if (method === "GET" && path === api.dashboard.profit.path) {
      const range = (qp.range as any) || undefined;
      const stats = await getProfit(range);
      return json(200, stats);
    }

    if (method === "GET" && path === api.dashboard.export.path) {
      try {
        const from = qp.from ? new Date(`${qp.from}T00:00:00`) : new Date();
        const to = qp.to ? new Date(`${qp.to}T00:00:00`) : new Date();
        const { filename, content } = await getExportCSV(from, to);
        return csv(200, filename, content);
      } catch {
        return json(500, { message: "Failed to generate report" });
      }
    }

    if (method === "GET" && path === api.dashboard.get_targets.path) {
      const targets = await getTargets();
      return json(200, targets);
    }

    if (method === "POST" && path === api.dashboard.update_targets.path) {
      try {
        const result = await updateTargetsFromBody(body);
        return json(200, result);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        return json(500, { message: "Failed to update targets" });
      }
    }

    if (method === "GET" && path === api.dashboard.labels.path) {
      const merged = await getMergedLabels();
      return json(200, merged);
    }

    if (method === "GET" && path === "/api/config/labels") {
      const labels = await getConfiguredLabels();
      return json(200, labels);
    }

    if (method === "POST" && path === "/api/config/labels") {
      try {
        const labels = await addLabel(body.label);
        return json(200, labels);
      } catch (err) {
        return json(400, { message: (err as any)?.message || "Label required" });
      }
    }

    if (method === "DELETE" && path === "/api/config/labels") {
      const labels = await removeLabel(body.label);
      return json(200, labels);
    }

    if (method === "GET" && path === "/api/config/categories") {
      const cats = await getConfiguredCategories();
      return json(200, cats);
    }

    if (method === "POST" && path === "/api/config/categories") {
      try {
        const cats = await addCategory(body.category);
        return json(200, cats);
      } catch (err) {
        return json(400, { message: (err as any)?.message || "Category required" });
      }
    }

    if (method === "DELETE" && path === "/api/config/categories") {
      const cats = await removeCategory(body.category);
      return json(200, cats);
    }

    if (method === "GET" && path === "/api/config/expense-categories") {
      const cats = await getExpenseCategories();
      return json(200, cats);
    }

    if (method === "POST" && path === "/api/config/expense-categories") {
      try {
        const cats = await addExpenseCategory(body.category);
        return json(200, cats);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        throw err;
      }
    }

    if (method === "DELETE" && path === "/api/config/expense-categories") {
      const cats = await removeExpenseCategory(body.category);
      return json(200, cats);
    }

    if (method === "GET" && path.startsWith("/api/recipes/")) {
      const idStr = path.split("/").pop();
      const menuItemId = Number(idStr);
      const recipe = await getRecipeByMenuItem(menuItemId);
      return json(200, recipe);
    }

    if (method === "POST" && path === api.recipes.upsert.path) {
      try {
        const result = await upsertRecipeFromBody(body);
        return json(201, result);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(400, { message: err.message });
        }
        return json(400, { message: (err as any)?.message || "Failed to save recipe" });
      }
    }

    if (method === "DELETE" && path.startsWith("/api/recipes/")) {
      try {
        const idStr = path.split("/").pop();
        const menuItemId = Number(idStr);
        await deleteRecipeForMenuItem(menuItemId);
        return { statusCode: 204, body: "" };
      } catch (err) {
        return json(400, { message: (err as any)?.message || "Failed to delete recipe" });
      }
    }

    // Tables
    if (method === "GET" && path === api.tables.list.path) {
      const tables = await storage.getTables();
      return json(200, tables);
    }

    if (method === "POST" && path === api.tables.create.path) {
      try {
        const validated = api.tables.create.input.parse(body);
        const table = await storage.createTable(validated);
        return json(201, table);
      } catch (err: any) {
        if (err instanceof z.ZodError) return json(400, { message: err.message });
        return json(400, { message: err.message || "Failed to create table" });
      }
    }

    if (method === "PUT" && path.startsWith("/api/tables/")) {
      try {
        const idStr = path.split("/").pop();
        const id = Number(idStr);
        const validated = api.tables.update.input.parse(body);
        const table = await storage.updateTable(id, validated);
        return json(200, table);
      } catch (err: any) {
        if (err instanceof z.ZodError) return json(400, { message: err.message });
        return json(404, { message: err.message || "Table not found" });
      }
    }

    if (method === "DELETE" && path.startsWith("/api/tables/")) {
      const idStr = path.split("/").pop();
      const id = Number(idStr);
      await storage.deleteTable(id);
      return { statusCode: 204, body: "" };
    }

    // Orders
    if (method === "GET" && path === api.orders.list.path) {
      const status = qp.status as string | undefined;
      const orders = await storage.getOrders(status);
      return json(200, orders);
    }

    if (method === "GET" && path.startsWith("/api/orders/")) {
      const idStr = path.split("/").pop();
      const id = Number(idStr);
      const order = await storage.getOrder(id);
      if (!order) return json(404, { message: "Order not found" });
      return json(200, order);
    }

    if (method === "POST" && path === api.orders.create.path) {
      try {
        const validated = api.orders.create.input.parse(body);
        const order = await storage.createOrder(validated);
        return json(201, order);
      } catch (err: any) {
        if (err instanceof z.ZodError) return json(400, { message: err.message });
        return json(400, { message: err.message || "Failed to create order" });
      }
    }

    if (method === "POST" && path.startsWith("/api/orders/") && path.endsWith("/items")) {
      try {
        const orderId = extractOrderId(path);
        if (!orderId || Number.isNaN(orderId)) return json(400, { message: "Invalid order id" });
        const raw = { ...body };
        const item = {
          ...raw,
          itemId: Number(raw.itemId),
          quantity: Number(raw.quantity),
          unitPrice: Number(raw.unitPrice),
          total: Number(raw.total),
          date: raw.date ? new Date(raw.date) : new Date(),
          labels: raw.labels || [],
        };
        const sale = await storage.addItemToOrder(orderId, item as any);
        return json(201, sale);
      } catch (err: any) {
        return json(400, { message: err.message || "Failed to add item" });
      }
    }

    if (method === "DELETE" && path.match(/^\/_?netlify\/functions\/api\/orders\/items\/\d+$|^\/api\/orders\/items\/\d+$/)) {
      try {
        const idStr = path.split("/").pop();
        const id = Number(idStr);
        await storage.removeItemFromOrder(id);
        return { statusCode: 204, body: "" };
      } catch (err: any) {
        return json(400, { message: err.message || "Failed to remove item" });
      }
    }

    if (method === "POST" && path.startsWith("/api/orders/") && path.endsWith("/close")) {
      try {
        const orderId = extractOrderId(path);
        if (!orderId || Number.isNaN(orderId)) return json(400, { message: "Invalid order id" });
        const input = api.orders.close.input.parse(body);
        const order = await storage.closeOrder(orderId, input.paymentType, input.customerId);
        return json(200, order);
      } catch (err: any) {
        if (err instanceof z.ZodError) return json(400, { message: err.message });
        return json(400, { message: err.message || "Failed to close order" });
      }
    }

    // Customers
    if (method === "GET" && path === api.customers.list.path) {
      const list = await storage.getCustomers();
      return json(200, list);
    }

    if (method === "POST" && path === api.customers.create.path) {
      try {
        const validated = api.customers.create.input.parse(body);
        const customer = await storage.createCustomer(validated);
        return json(201, customer);
      } catch (err: any) {
        if (err instanceof z.ZodError) return json(400, { message: err.message });
        return json(400, { message: err.message || "Failed to create customer" });
      }
    }

    // Receivables
    if (method === "GET" && path === api.receivables.list.path) {
      const status = (qp.status as string | undefined) as any;
      const list = await storage.getReceivables(status);
      return json(200, list);
    }

    if (method === "GET" && path === api.receivables.summary.path) {
      const summary = await storage.getReceivablesSummary();
      return json(200, summary);
    }

    if (method === "POST" && path.startsWith("/api/receivables/") && path.endsWith("/payments")) {
      try {
        const idStr = path.split("/").filter(Boolean).slice(-2)[0];
        const id = Number(idStr);
        const validated = api.receivables.pay.input.parse(body);
        const updated = await storage.recordPayment(id, validated.amount, validated.method);
        return json(200, updated);
      } catch (err: any) {
        if (err instanceof z.ZodError) return json(400, { message: err.message });
        return json(400, { message: err.message || "Failed to record payment" });
      }
    }

    // Reports
    if (method === "GET" && path === api.reports.revenue_by_item.path) {
      const from = qp.from ? new Date(`${qp.from}T00:00:00`) : undefined;
      const to = qp.to ? new Date(`${qp.to}T00:00:00`) : undefined;
      const sort = (qp.sort as 'asc'|'desc' | undefined) || 'desc';
      if (!from || !to) return json(400, { message: "from and to are required" });
      const data = await storage.getRevenueByItem(from, to, sort);
      return json(200, data);
    }

    if (method === "GET" && path === api.reports.revenue_summary.path) {
      const from = qp.from ? new Date(`${qp.from}T00:00:00`) : undefined;
      const to = qp.to ? new Date(`${qp.to}T00:00:00`) : undefined;
      if (!from || !to) return json(400, { message: "from and to are required" });
      const data = await storage.getRevenueSummary(from, to);
      return json(200, data);
    }

    if (method === "GET" && path === api.reports.revenue_by_payment.path) {
      const from = qp.from ? new Date(`${qp.from}T00:00:00`) : undefined;
      const to = qp.to ? new Date(`${qp.to}T00:00:00`) : undefined;
      if (!from || !to) return json(400, { message: "from and to are required" });
      const data = await storage.getRevenueByPayment(from, to);
      return json(200, data);
    }

    return json(404, { message: "Not found" });
  } catch (err: any) {
    return json(500, { message: err?.message || "Internal Server Error" });
  }
};
