import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { listExpenses, createExpenseFromBody, updateExpenseFromBody, deleteExpenseById, getExpenseCategories, addExpenseCategory, removeExpenseCategory } from "./services/expenseService";
import { api } from "@shared/routes";
import { z } from "zod";
import { listItems, getItemById, createItemFromBody, updateItemFromBody, deleteItemById } from "./services/itemService";
import { listSales, createSaleFromBody } from "./services/salesService";
import { listStock, recordStockTransactionFromBody } from "./services/stockService";
import { getDashboardStats, getProfit, getExportCSV, getTargets, updateTargetsFromBody } from "./services/dashboardService";
import { getMergedLabels, getConfiguredLabels, addLabel, removeLabel, getConfiguredCategories, addCategory, removeCategory } from "./services/configService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Items
  app.get(api.items.list.path, async (req, res) => {
    const items = await listItems();
    res.json(items);
  });

  app.get(api.items.get.path, async (req, res) => {
    const item = await getItemById(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      const item = await createItemFromBody(req.body);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.items.update.path, async (req, res) => {
    try {
      const item = await updateItemFromBody(Number(req.params.id), req.body);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      res.status(404).json({ message: "Item not found" });
    }
  });

  app.delete(api.items.delete.path, async (req, res) => {
    await deleteItemById(Number(req.params.id));
    res.status(204).send();
  });

  // Expenses
  app.get(api.expenses.list.path, async (req, res) => {
    const from = req.query.from ? new Date(`${req.query.from as string}T00:00:00`) : undefined;
    const to = req.query.to ? new Date(`${req.query.to as string}T00:00:00`) : undefined;
    const result = await listExpenses(from, to);
    res.json(result);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const exp = await createExpenseFromBody(req.body);
      res.status(201).json(exp);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.put(api.expenses.update.path, async (req, res) => {
    try {
      const exp = await updateExpenseFromBody(Number(req.params.id), req.body);
      res.json(exp);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      res.status(404).json({ message: "Expense not found" });
    }
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    await deleteExpenseById(Number(req.params.id));
    res.status(204).send();
  });

  // Sales
  app.get(api.sales.list.path, async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const hasRange = req.query.from || req.query.to;
    if (hasRange) {
      const from = req.query.from ? new Date(`${req.query.from as string}T00:00:00`) : undefined;
      const to = req.query.to ? new Date(`${req.query.to as string}T00:00:00`) : undefined;
      const sales = await (await import("./services/salesService")).listSalesRange(from, to, limit);
      return res.json(sales);
    } else {
      const date = req.query.date ? new Date(`${req.query.date as string}T00:00:00`) : undefined;
      const sales = await listSales(date, limit);
      return res.json(sales);
    }
  });

  app.post(api.sales.create.path, async (req, res) => {
    try {
      const sale = await createSaleFromBody(req.body);
      res.status(201).json(sale);
    } catch (err) {
      console.error("Sale creation error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error: " + err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stock
  app.get(api.stock.list.path, async (req, res) => {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const stocks = await listStock(date);
    res.json(stocks);
  });

  app.post(api.stock.transaction.path, async (req, res) => {
    try {
      const stock = await recordStockTransactionFromBody(req.body);
      res.json(stock);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  // Dashboard
  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await getDashboardStats(req.query.range as any);
    res.json(stats);
  });

  app.get(api.dashboard.profit.path, async (req, res) => {
    const stats = await getProfit(req.query.range as any);
    res.json(stats);
  });

  app.get(api.dashboard.export.path, async (req, res) => {
    try {
      const from = req.query.from ? new Date(`${req.query.from as string}T00:00:00`) : new Date();
      const to = req.query.to ? new Date(`${req.query.to as string}T00:00:00`) : new Date();
      const { filename, content } = await getExportCSV(from, to);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(content);
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get(api.dashboard.get_targets.path, async (req, res) => {
    const targets = await getTargets();
    res.json(targets);
  });

  app.post(api.dashboard.update_targets.path, async (req, res) => {
    try {
      const result = await updateTargetsFromBody(req.body);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      res.status(500).json({ message: "Failed to update targets" });
    }
  });

  app.get(api.dashboard.labels.path, async (req, res) => {
    const merged = await getMergedLabels();
    res.json(merged);
  });

  app.get("/api/config/labels", async (req, res) => {
    const labels = await getConfiguredLabels();
    res.json(labels);
  });

  app.post("/api/config/labels", async (req, res) => {
    try {
      const labels = await addLabel(req.body.label);
      res.json(labels);
    } catch (err) {
      return res.status(400).json({ message: (err as any)?.message || "Label required" });
    }
  });

  app.delete("/api/config/labels", async (req, res) => {
    const labels = await removeLabel(req.body.label);
    res.json(labels);
  });

  app.get("/api/config/categories", async (req, res) => {
    const cats = await getConfiguredCategories();
    res.json(cats);
  });

  app.post("/api/config/categories", async (req, res) => {
    try {
      const cats = await addCategory(req.body.category);
      res.json(cats);
    } catch (err) {
      return res.status(400).json({ message: (err as any)?.message || "Category required" });
    }
  });

  app.delete("/api/config/categories", async (req, res) => {
    const cats = await removeCategory(req.body.category);
    res.json(cats);
  });

  app.get("/api/config/expense-categories", async (req, res) => {
    const cats = await getExpenseCategories();
    res.json(cats);
  });

  app.post("/api/config/expense-categories", async (req, res) => {
    try {
      const cats = await addExpenseCategory(req.body.category);
      res.json(cats);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.delete("/api/config/expense-categories", async (req, res) => {
    const cats = await removeExpenseCategory(req.body.category);
    res.json(cats);
  });

  await seedDatabase();

  return httpServer;
}

// Seed function
export async function seedDatabase() {
  const items = await storage.getItems();
  if (items.length === 0) {
    // Add sample items
    const sampleItems = [
      { name: "Cappuccino", category: "Drinks", costPrice: 8000, sellingPrice: 25000, minStock: 20 },
      { name: "Espresso", category: "Drinks", costPrice: 6000, sellingPrice: 15000, minStock: 20 },
      { name: "Chicken Sandwich", category: "Main", costPrice: 15000, sellingPrice: 35000, minStock: 10 },
      { name: "Muffin", category: "Snacks", costPrice: 5000, sellingPrice: 12000, minStock: 15 },
    ];
    
    for (const item of sampleItems) {
      await storage.createItem(item);
    }
    
    console.log("Database seeded with sample items");
  }
}
