import { db } from "./db";
import {
  items, sales, stock, settings,
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
  getDashboardStats(range?: 'weekly' | 'monthly' | 'quarterly'): Promise<{
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    quarterlySales: number;
    topItems: { name: string; quantity: number; total: number }[];
    itemSalesTrend: { date: string; items: Record<string, number> }[];
  }>;
  getExportData(from: Date, to: Date): Promise<{
    summary: {
      totalRevenue: number;
      totalItemsSold: number;
      topCategory: string;
      averageOrderValue: number;
      wastageTotal: number;
    };
    sales: (Sale & { item: Item })[];
  }>;

  // Stock
  getStock(date?: Date): Promise<(Stock & { item: Item })[]>;
  recordStockTransaction(data: CreateStockTransactionRequest): Promise<Stock>;

  // Settings
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;

  // Labels
  getUniqueLabels(): Promise<string[]>;
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
    await db.delete(items).where(eq(items.id, id));
  }

  async getSales(date?: Date, limit: number = 50): Promise<(Sale & { item: Item })[]> {
    return this.getSalesWithLabels(date, limit);
  }

  async getSalesWithLabels(date?: Date, limit: number = 50): Promise<(Sale & { item: Item })[]> {
    let query = db.select({
      id: sales.id,
      date: sales.date,
      itemId: sales.itemId,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      labels: sales.labels,
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

    return await query.orderBy(desc(sales.date)).limit(limit) as any;
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(insertSale).returning();
    await this.updateDailyStockSales(sale.itemId, sale.date, sale.quantity);
    return sale;
  }

  private async updateDailyStockSales(itemId: number, date: Date, quantity: number) {
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
      await db.insert(stock).values({
        itemId,
        date: date,
        openingStock: 0,
        purchased: 0,
        sold: quantity,
        wastage: 0,
        closingStock: 0 - quantity
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

    const current = { ...record, ...updates };
    updates.closingStock = (current.openingStock || 0) + (current.purchased || 0) - (current.sold || 0) - (current.wastage || 0);

    const [updated] = await db.update(stock)
      .set(updates)
      .where(eq(stock.id, record.id))
      .returning();
      
    return updated;
  }

  async getDashboardStats(range: 'weekly' | 'monthly' | 'quarterly' = 'weekly') {
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'monthly':
        startDate = startOfMonth(now);
        break;
      case 'quarterly':
        startDate = startOfQuarter(now);
        break;
      case 'weekly':
      default:
        startDate = startOfWeek(now);
    }
    
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

    const topItemsRes = await db.select({
      name: items.name,
      quantity: sum(sales.quantity),
      total: sum(sales.total)
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .where(gte(sales.date, startDate))
    .groupBy(items.name)
    .orderBy(desc(sum(sales.total)))
    .limit(5);

    const topItems = topItemsRes.map(i => ({
      name: i.name,
      quantity: Number(i.quantity),
      total: Number(i.total)
    }));

    const salesTrendRes = await db.select({
      date: sql<string>`DATE(${sales.date})`,
      itemName: items.name,
      total: sum(sales.total)
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .where(gte(sales.date, startDate))
    .groupBy(sql`DATE(${sales.date})`, items.name)
    .orderBy(sql`DATE(${sales.date})`);

    const trendMap = new Map<string, Record<string, number>>();
    salesTrendRes.forEach(row => {
      const dateStr = row.date;
      if (!trendMap.has(dateStr)) {
        trendMap.set(dateStr, {});
      }
      trendMap.get(dateStr)![row.itemName] = Number(row.total);
    });

    const itemSalesTrend = Array.from(trendMap.entries()).map(([date, items]) => ({
      date,
      items
    }));

    // Label distribution
    const labelDistributionMap = new Map<string, number>();
    const allSales = await db.select({ labels: sales.labels, total: sales.total })
      .from(sales)
      .where(gte(sales.date, startDate));

    allSales.forEach(s => {
      if (s.labels && s.labels.length > 0) {
        s.labels.forEach(label => {
          labelDistributionMap.set(label, (labelDistributionMap.get(label) || 0) + Number(s.total));
        });
      }
    });

    const labelDistribution = Array.from(labelDistributionMap.entries()).map(([name, value]) => ({
      name,
      value: value / 100 // Convert to NPR
    })).sort((a, b) => b.value - a.value);

    return {
      dailySales,
      weeklySales,
      monthlySales,
      quarterlySales,
      topItems,
      itemSalesTrend,
      labelDistribution
    };
  }

  async getExportData(from: Date, to: Date): Promise<{
    summary: {
      totalRevenue: number;
      totalItemsSold: number;
      topCategory: string;
      averageOrderValue: number;
      wastageTotal: number;
    };
    sales: (Sale & { item: Item })[];
  }> {
    const start = startOfDay(from);
    const end = endOfDay(to);

    const salesData = await db.select({
      id: sales.id,
      date: sales.date,
      itemId: sales.itemId,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      labels: sales.labels,
      createdAt: sales.createdAt,
      item: items
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .where(and(gte(sales.date, start), lte(sales.date, end)))
    .orderBy(desc(sales.date));

    const stockData = await db.select({
      wastage: sum(stock.wastage)
    })
    .from(stock)
    .where(and(gte(stock.date, start), lte(stock.date, end)));

    const topCategoryRes = await db.select({
      category: items.category,
      total: sum(sales.total)
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .where(and(gte(sales.date, start), lte(sales.date, end)))
    .groupBy(items.category)
    .orderBy(desc(sum(sales.total)))
    .limit(1);

    const totalRevenue = salesData.reduce((sum, s) => sum + s.total, 0);
    const totalItemsSold = salesData.reduce((sum, s) => sum + s.quantity, 0);
    const averageOrderValue = salesData.length > 0 ? totalRevenue / salesData.length : 0;
    const wastageTotal = Number(stockData[0]?.wastage) || 0;

    return {
      summary: {
        totalRevenue,
        totalItemsSold,
        topCategory: topCategoryRes[0]?.category || 'N/A',
        averageOrderValue,
        wastageTotal
      },
      sales: salesData as any
    };
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const existing = await this.getSetting(key);
    if (existing !== undefined) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async getUniqueLabels(): Promise<string[]> {
    const result = await db.select({ labels: sales.labels }).from(sales);
    const labelSet = new Set<string>();
    result.forEach(row => {
      if (row.labels) {
        row.labels.forEach(l => labelSet.add(l));
      }
    });
    return Array.from(labelSet).sort();
  }
}

export const storage = new DatabaseStorage();
