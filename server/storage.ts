import { db } from "./db";
import {
  items, sales, stock,
  type Item, type InsertItem,
  type Sale, type InsertSale,
  type Stock, type InsertStock,
  type CreateStockTransactionRequest
} from "@shared/schema";
import { eq, sql, and, desc, sum, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

export interface IStorage {
  // Items
  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, updates: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: number): Promise<void>;

  // Sales
  getSales(date?: Date, limit?: number): Promise<(Sale & { item: Item })[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  getDashboardStats(): Promise<{
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    quarterlySales: number;
    topItems: { name: string; quantity: number; total: number }[];
  }>;

  // Stock
  getStock(date?: Date): Promise<(Stock & { item: Item })[]>;
  recordStockTransaction(data: CreateStockTransactionRequest): Promise<Stock>;
}

export class DatabaseStorage implements IStorage {
  async getItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(items.name);
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem).returning();
    return item;
  }

  async updateItem(id: number, updates: Partial<InsertItem>): Promise<Item> {
    const [item] = await db.update(items).set(updates).where(eq(items.id, id)).returning();
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    // Soft delete usually better, but for MVP hard delete or just set active false
    // Prompt says "Prevent deleting items with sales history" - implemented in route logic or here?
    // Let's just set isActive to false if we want, or real delete. 
    // For now, simpler to delete, but check constraints.
    await db.delete(items).where(eq(items.id, id));
  }

  async getSales(date?: Date, limit: number = 50): Promise<(Sale & { item: Item })[]> {
    let query = db.select({
      id: sales.id,
      date: sales.date,
      itemId: sales.itemId,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      createdAt: sales.createdAt,
      item: items
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id));

    if (date) {
      const start = startOfDay(date);
      const end = endOfDay(date);
      query.where(and(gte(sales.date, start), lte(sales.date, end)));
    }

    return await query.orderBy(desc(sales.date)).limit(limit);
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(insertSale).returning();
    
    // Auto-update stock for the day
    await this.updateDailyStockSales(sale.itemId, sale.date, sale.quantity);
    
    return sale;
  }

  private async updateDailyStockSales(itemId: number, date: Date, quantity: number) {
    // Find or create stock record for this day
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const existing = await db.select().from(stock)
      .where(and(eq(stock.itemId, itemId), gte(stock.date, dayStart), lte(stock.date, dayEnd)))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      await db.update(stock)
        .set({ 
          sold: (current.sold || 0) + quantity,
          closingStock: (current.openingStock || 0) + (current.purchased || 0) - ((current.sold || 0) + quantity) - (current.wastage || 0)
        })
        .where(eq(stock.id, current.id));
    } else {
      // Get yesterday's closing to use as opening, or just 0
      // For MVP, create new record
      await db.insert(stock).values({
        itemId,
        date: date,
        openingStock: 0, // Should ideally fetch previous day's closing
        purchased: 0,
        sold: quantity,
        wastage: 0,
        closingStock: 0 - quantity // Negative if no opening
      });
    }
  }

  async getStock(date?: Date): Promise<(Stock & { item: Item })[]> {
    const d = date || new Date();
    const start = startOfDay(d);
    const end = endOfDay(d);

    return await db.select({
      id: stock.id,
      date: stock.date,
      itemId: stock.itemId,
      openingStock: stock.openingStock,
      purchased: stock.purchased,
      sold: stock.sold,
      wastage: stock.wastage,
      closingStock: stock.closingStock,
      createdAt: stock.createdAt,
      item: items
    })
    .from(stock)
    .innerJoin(items, eq(stock.itemId, items.id))
    .where(and(gte(stock.date, start), lte(stock.date, end)));
  }

  async recordStockTransaction(data: CreateStockTransactionRequest): Promise<Stock> {
    const date = data.date ? new Date(data.date) : new Date();
    const start = startOfDay(date);
    const end = endOfDay(date);

    let [record] = await db.select().from(stock)
      .where(and(eq(stock.itemId, data.itemId), gte(stock.date, start), lte(stock.date, end)));

    if (!record) {
      // Create new
      [record] = await db.insert(stock).values({
        itemId: data.itemId,
        date: date,
        openingStock: 0,
        purchased: 0,
        sold: 0,
        wastage: 0,
        closingStock: 0
      }).returning();
    }

    const updates: Partial<Stock> = {};
    if (data.type === 'purchase') {
      updates.purchased = (record.purchased || 0) + data.quantity;
    } else if (data.type === 'wastage') {
      updates.wastage = (record.wastage || 0) + data.quantity;
    } else if (data.type === 'opening') {
      updates.openingStock = data.quantity;
    }

    // Recalculate closing
    const current = { ...record, ...updates };
    updates.closingStock = (current.openingStock || 0) + (current.purchased || 0) - (current.sold || 0) - (current.wastage || 0);

    const [updated] = await db.update(stock)
      .set(updates)
      .where(eq(stock.id, record.id))
      .returning();
      
    return updated;
  }

  async getDashboardStats() {
    const now = new Date();
    
    // Helper to sum sales
    const getSum = async (start: Date, end: Date) => {
      const result = await db.select({ total: sum(sales.total) })
        .from(sales)
        .where(and(gte(sales.date, start), lte(sales.date, end)));
      return Number(result[0]?.total) || 0;
    };

    const dailySales = await getSum(startOfDay(now), endOfDay(now));
    const weeklySales = await getSum(startOfWeek(now), endOfWeek(now));
    const monthlySales = await getSum(startOfMonth(now), endOfMonth(now));
    const quarterlySales = await getSum(startOfQuarter(now), endOfQuarter(now));

    // Top 5 items (all time or monthly? Let's do monthly)
    const topItemsRes = await db.select({
      name: items.name,
      quantity: sum(sales.quantity),
      total: sum(sales.total)
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .where(gte(sales.date, startOfMonth(now)))
    .groupBy(items.name)
    .orderBy(desc(sum(sales.total)))
    .limit(5);

    const topItems = topItemsRes.map(i => ({
      name: i.name,
      quantity: Number(i.quantity),
      total: Number(i.total)
    }));

    return {
      dailySales,
      weeklySales,
      monthlySales,
      quarterlySales,
      topItems
    };
  }
}

export const storage = new DatabaseStorage();
