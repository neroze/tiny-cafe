import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Items
  app.get(api.items.list.path, async (req, res) => {
    const items = await storage.getItems();
    res.json(items);
  });

  app.get(api.items.get.path, async (req, res) => {
    const item = await storage.getItem(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const item = await storage.createItem(input);
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
      const input = api.items.update.input.parse(req.body);
      const item = await storage.updateItem(Number(req.params.id), input);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      res.status(404).json({ message: "Item not found" });
    }
  });

  app.delete(api.items.delete.path, async (req, res) => {
    await storage.deleteItem(Number(req.params.id));
    res.status(204).send();
  });

  // Sales
  app.get(api.sales.list.path, async (req, res) => {
    const date = req.query.date ? new Date(req.query.date as string) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const sales = await storage.getSales(date, limit);
    res.json(sales);
  });

  app.post(api.sales.create.path, async (req, res) => {
    try {
      // Robust date and number parsing
      const rawData = { ...req.body };
      
      // Coerce numeric values
      const itemId = Number(rawData.itemId);
      const quantity = Number(rawData.quantity);
      const unitPrice = Number(rawData.unitPrice);
      const total = Number(rawData.total);
      
      // Handle date properly - check if it's already a date object or string
      let date: Date;
      if (rawData.date) {
        date = new Date(rawData.date);
        // Fallback to now if invalid date
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
        date
      });
      
      const sale = await storage.createSale(input);
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
    const stocks = await storage.getStock(date);
    res.json(stocks);
  });

  app.post(api.stock.transaction.path, async (req, res) => {
    try {
      const input = api.stock.transaction.input.parse({
        ...req.body,
        itemId: Number(req.body.itemId),
        quantity: Number(req.body.quantity),
      });
      const stock = await storage.recordStockTransaction(input);
      res.json(stock);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  // Dashboard
  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
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
