import type { Handler } from "@netlify/functions";
import { listExpenses, createExpenseFromBody, updateExpenseFromBody, deleteExpenseById, getExpenseCategories, addExpenseCategory, removeExpenseCategory } from "../../server/services/expenseService";
import { api } from "../../shared/routes";
import { z } from "zod";
import { listItems, getItemById, createItemFromBody, updateItemFromBody, deleteItemById } from "../../server/services/itemService";
import { listSales, createSaleFromBody } from "../../server/services/salesService";
import { listStock, recordStockTransactionFromBody } from "../../server/services/stockService";
import { getDashboardStats, getProfit, getExportCSV, getTargets, updateTargetsFromBody } from "../../server/services/dashboardService";
import { getMergedLabels, getConfiguredLabels, addLabel, removeLabel, getConfiguredCategories, addCategory, removeCategory } from "../../server/services/configService";

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

    if (method === "GET" && path === api.expenses.list.path) {
      const from = qp.from ? new Date(`${qp.from}T00:00:00`) : undefined;
      const to = qp.to ? new Date(`${qp.to}T00:00:00`) : undefined;
      const result = await listExpenses(from, to);
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
      const limit = qp.limit ? Number(qp.limit) : 50;
      if (qp.from || qp.to) {
        const from = qp.from ? new Date(`${qp.from}T00:00:00`) : undefined;
        const to = qp.to ? new Date(`${qp.to}T00:00:00`) : undefined;
        const sales = await (await import("../../server/services/salesService")).listSalesRange(from, to, limit);
        return json(200, sales);
      } else {
        const date = qp.date ? new Date(`${qp.date}T00:00:00`) : undefined;
        const sales = await listSales(date, limit);
        return json(200, sales);
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

    return json(404, { message: "Not found" });
  } catch (err: any) {
    return json(500, { message: err?.message || "Internal Server Error" });
  }
};
