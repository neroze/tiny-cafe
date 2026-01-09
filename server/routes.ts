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
        date,
        labels: rawData.labels || []
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
    const stats = await storage.getDashboardStats(req.query.range as any);
    res.json(stats);
  });

  app.get(api.dashboard.export.path, async (req, res) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : new Date();
      const to = req.query.to ? new Date(req.query.to as string) : new Date();
      
      const data = await storage.getExportData(from, to);
      
      let csv = "EXECUTIVE SUMMARY\n";
      csv += `Report Period,${from.toLocaleDateString()} to ${to.toLocaleDateString()}\n`;
      csv += `Total Revenue,NPR ${(data.summary.totalRevenue / 100).toFixed(2)}\n`;
      csv += `Total Items Sold,${data.summary.totalItemsSold}\n`;
      csv += `Average Order Value,NPR ${(data.summary.averageOrderValue / 100).toFixed(2)}\n`;
      csv += `Top Performing Category,${data.summary.topCategory}\n`;
      csv += `Total Stock Wastage,${data.summary.wastageTotal} units\n\n`;
      
      csv += "DETAILED SALES REPORT\n";
      csv += "ID,Date,Item,Category,Quantity,Unit Price (NPR),Total (NPR)\n";
      
      data.sales.forEach(s => {
        csv += `${s.id},${s.date.toLocaleDateString()},"${s.item.name}",${s.item.category},${s.quantity},${(s.unitPrice / 100).toFixed(2)},${(s.total / 100).toFixed(2)}\n`;
      });

      // Label based grouping
      const labelStats: Record<string, { items: Record<string, { qty: number, cost: number, total: number }> }> = {};
      data.sales.forEach(s => {
        const labels = s.labels || [];
        labels.forEach((l: string) => {
          if (!labelStats[l]) labelStats[l] = { items: {} };
          const itemName = s.item.name;
          if (!labelStats[l].items[itemName]) {
            labelStats[l].items[itemName] = { qty: 0, cost: s.unitPrice, total: 0 };
          }
          labelStats[l].items[itemName].qty += s.quantity;
          labelStats[l].items[itemName].total += s.total;
        });
      });

      if (Object.keys(labelStats).length > 0) {
        csv += "\nLABEL BASED REPORT\n";
        Object.entries(labelStats).forEach(([label, stats]) => {
          csv += `Label: ${label}\n`;
          Object.entries(stats.items).forEach(([itemName, item]) => {
            csv += `- ${itemName}: ${item.qty} | unit cost ${(item.cost / 100).toFixed(2)} | total sales: ${(item.total / 100).toFixed(2)}\n`;
          });
        });
      }
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=cafe_report_${from.toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get(api.dashboard.get_targets.path, async (req, res) => {
    const weekly = await storage.getSetting('target_weekly');
    const monthly = await storage.getSetting('target_monthly');
    const quarterly = await storage.getSetting('target_quarterly');
    
    res.json({
      weekly: Number(weekly) || 1550000,
      monthly: Number(monthly) || 6670000,
      quarterly: Number(quarterly) || 20000000,
    });
  });

  app.post(api.dashboard.update_targets.path, async (req, res) => {
    try {
      const input = api.dashboard.update_targets.input.parse(req.body);
      await storage.setSetting('target_weekly', input.weekly.toString());
      await storage.setSetting('target_monthly', input.monthly.toString());
      await storage.setSetting('target_quarterly', input.quarterly.toString());
      res.json({ message: "Targets updated successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.message });
      res.status(500).json({ message: "Failed to update targets" });
    }
  });

  app.get(api.dashboard.labels.path, async (req, res) => {
    const configuredLabels = await storage.getSetting('configured_labels');
    const labels = configuredLabels ? JSON.parse(configuredLabels) : [];
    const uniqueLabels = await storage.getUniqueLabels();
    
    // Merge configured labels with existing ones from sales
    const merged = Array.from(new Set([...labels, ...uniqueLabels]));
    res.json(merged);
  });

  app.get("/api/config/labels", async (req, res) => {
    const labelsStr = await storage.getSetting('configured_labels');
    res.json(labelsStr ? JSON.parse(labelsStr) : []);
  });

  app.post("/api/config/labels", async (req, res) => {
    const { label } = req.body;
    if (!label) return res.status(400).json({ message: "Label required" });
    
    const labelsStr = await storage.getSetting('configured_labels');
    let labels = labelsStr ? JSON.parse(labelsStr) : [];
    if (!labels.includes(label)) {
      labels.push(label);
      await storage.setSetting('configured_labels', JSON.stringify(labels));
    }
    res.json(labels);
  });

  app.delete("/api/config/labels", async (req, res) => {
    const { label } = req.body;
    const labelsStr = await storage.getSetting('configured_labels');
    let labels = labelsStr ? JSON.parse(labelsStr) : [];
    labels = labels.filter((l: string) => l !== label);
    await storage.setSetting('configured_labels', JSON.stringify(labels));
    res.json(labels);
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
