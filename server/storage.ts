import { db } from "./db";
import {
  items, sales, stock, settings, expenses, recipes, recipeItems, tables, orders, customers, receivables, payments,
  type Item, type InsertItem,
  type Sale, type InsertSale,
  type Stock, type InsertStock,
  type Expense, type InsertExpense,
  type CreateStockTransactionRequest,
  type RecipeItem,
  type Table, type InsertTable,
  type Order, type InsertOrder,
  type Customer, type InsertCustomer,
  type Receivable,
  type Payment
} from "@shared/schema";
import { eq, sql, and, desc, sum, gte, lte, gt, or, isNull } from "drizzle-orm";
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
  updateSale(id: number, updates: Partial<InsertSale>): Promise<Sale>;
  getSalesRange(from?: Date, to?: Date, limit?: number): Promise<(Sale & { item: Item })[]>;
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

  // Reports
  getRevenueByItem(from: Date, to: Date, sort?: 'asc'|'desc'): Promise<{ itemId: number; name: string; quantity: number; revenue: number }[]>;
  getRevenueSummary(from: Date, to: Date): Promise<{ totalRevenue: number; cashReceived: number; cardReceived: number; creditSales: number }>;
  getRevenueByPayment(from: Date, to: Date): Promise<{ method: 'CASH'|'CARD'|'CREDIT'; revenue: number }[]>;

  // Stock
  getStock(date?: Date): Promise<(Stock & { item: Item })[]>;
  recordStockTransaction(data: CreateStockTransactionRequest): Promise<Stock>;

  // Recipes
  getRecipeByMenuItem(menuItemId: number): Promise<{ id: number; menuItemId: number; ingredients: RecipeItem[] } | null>;
  upsertRecipe(menuItemId: number, ingredients: { ingredientId: number; quantity: number; unit: string }[]): Promise<{ message: string }>;
  deleteRecipe(menuItemId: number): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;

  // Labels
  getUniqueLabels(): Promise<string[]>;

  // Expenses
  getExpenses(from?: Date, to?: Date): Promise<{
    total: number;
    byCategory: Record<string, number>;
    items: (Expense & { allocatedDaily?: number })[];
  }>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, updates: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Profit
  getProfit(range?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<{
    totalSales: number;
    totalCOGS: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    netMarginPct: number;
    trend: { date: string; net: number }[];
    alerts: { consecutiveNetLossDays: number; expenseSpike: boolean };
  }>;

  // Tables
  getTables(): Promise<Table[]>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: number, updates: Partial<InsertTable>): Promise<Table>;
  deleteTable(id: number): Promise<void>;

  // Orders
  getOrders(status?: string): Promise<(Order & { table: Table | null, items: (Sale & { item: Item })[] })[]>;
  getOrder(id: number): Promise<(Order & { table: Table | null, items: (Sale & { item: Item })[] }) | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order>;
  addItemToOrder(orderId: number, item: InsertSale): Promise<Sale>;
  removeItemFromOrder(saleId: number): Promise<void>;
  closeOrder(id: number, paymentType?: 'CASH'|'CARD'|'CREDIT', customerId?: number): Promise<Order>;

  // Customers & Receivables
  getCustomers(): Promise<Customer[]>;
  createCustomer(cust: InsertCustomer): Promise<Customer>;
  getReceivables(status?: 'OPEN'|'SETTLED'): Promise<(Receivable & { customer: Customer })[]>;
  getReceivablesSummary(): Promise<{ totalOutstanding: number; byCustomer: { customerId: number; name: string; outstanding: number }[] }>;
  createReceivable(orderId: number, customerId: number, amount: number): Promise<Receivable>;
  recordPayment(receivableId: number, amount: number, method: 'CASH'|'CARD'): Promise<Receivable>;
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
      orderId: sales.orderId,
      date: sales.date,
      itemId: sales.itemId,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      labels: sales.labels,
      cogs: sales.cogs,
      createdAt: sales.createdAt,
      item: items
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .leftJoin(orders, eq(sales.orderId, orders.id));

    const conditions = [or(isNull(sales.orderId), eq(orders.status, 'CLOSED'))];

    if (date) {
      const start = startOfDay(date);
      const end = endOfDay(date);
      conditions.push(and(gte(sales.date, start), lte(sales.date, end)));
    }

    return await query.where(and(...conditions)).orderBy(desc(sales.date)).limit(limit) as any;
  }

  async getSalesRange(from?: Date, to?: Date, limit: number = 500): Promise<(Sale & { item: Item })[]> {
    const start = from ? startOfDay(from) : startOfMonth(new Date());
    const end = to ? endOfDay(to) : endOfDay(new Date());
    
    return await db.select({
      id: sales.id,
      orderId: sales.orderId,
      date: sales.date,
      itemId: sales.itemId,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      labels: sales.labels,
      cogs: sales.cogs,
      createdAt: sales.createdAt,
      item: items
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .leftJoin(orders, eq(sales.orderId, orders.id))
    .where(and(
      gte(sales.date, start), 
      lte(sales.date, end),
      or(isNull(sales.orderId), eq(orders.status, 'CLOSED'))
    ))
    .orderBy(desc(sales.date))
    .limit(limit) as any;
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const recipe = await this.getRecipeByMenuItem(insertSale.itemId);
    if (!recipe || recipe.ingredients.length === 0) {
      throw new Error("Recipe required for this menu item");
    }
    const allowInsufficient = (await this.getSetting("allow_sale_without_stock")) === "true";
    // Verify stock availability
    for (const comp of recipe.ingredients) {
      const needed = Math.round(Number(comp.quantity) * Number(insertSale.quantity));
      const available = await this.getAvailableStock(comp.ingredientId, insertSale.date);
      if (!allowInsufficient && available < needed) {
        throw new Error(`Insufficient stock for ingredient ID ${comp.ingredientId}: need ${needed}, have ${available}`);
      }
    }
    // Compute COGS
    let saleCogs = 0;
    for (const comp of recipe.ingredients) {
      const [ing] = await db.select().from(items).where(eq(items.id, comp.ingredientId)).limit(1);
      if (!ing) continue;
      const perUnitCost = Number(ing.costPrice);
      saleCogs += Number(comp.quantity) * perUnitCost;
    }
    saleCogs = saleCogs * Number(insertSale.quantity);
    const [sale] = await db.insert(sales).values({ ...insertSale, cogs: String(saleCogs) }).returning();
    // Deduct ingredient stock usage
    for (const comp of recipe.ingredients) {
      const useQty = Math.round(Number(comp.quantity) * Number(insertSale.quantity));
      await this.consumeIngredient(comp.ingredientId, sale.date, useQty);
    }
    // Update sold count for the menu item itself -> REMOVED per requirements (Menu items don't manage inventory)
    // await this.updateDailyStockSales(sale.itemId, sale.date, sale.quantity);
    return sale;
  }
  
  async updateSale(id: number, updates: Partial<InsertSale>): Promise<Sale> {
    // Fetch existing sale
    const [existing] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    if (!existing) throw new Error("Sale not found");
    const [updated] = await db.update(sales).set(updates).where(eq(sales.id, id)).returning();
    
    // TODO: Handle inventory adjustment for sale updates correctly. 
    // Currently disabled to prevent pollution of stock table with menu items.
    /*
    // Recalculate stock for old item/date and new item/date
    const oldItemId = existing.itemId;
    const oldDate = existing.date;
    const newItemId = updated.itemId;
    const newDate = updated.date;
    await this.recalcDailyStockSales(oldItemId, oldDate);
    if (oldItemId !== newItemId || startOfDay(oldDate).getTime() !== startOfDay(newDate).getTime()) {
      await this.recalcDailyStockSales(newItemId, newDate);
    }
    */
    return updated;
  }

  // Helper to ensure continuous inventory
  private async getOrInitDailyStock(itemId: number, date: Date): Promise<Stock> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    // Check for existing record
    const [existing] = await db.select().from(stock)
      .where(and(eq(stock.itemId, itemId), gte(stock.date, dayStart), lte(stock.date, dayEnd)))
      .limit(1);

    // Find last record strictly before today to verify continuity
    const [lastRecord] = await db.select().from(stock)
      .where(and(eq(stock.itemId, itemId), lte(stock.date, dayStart))) // strictly before today
      .orderBy(desc(stock.date))
      .limit(1);

    const expectedOpening = lastRecord ? (lastRecord.closingStock || 0) : 0;
      
    if (existing) {
      // SELF-HEALING: Verify continuity
      // If existing opening stock doesn't match previous closing, fix it.
      if (existing.openingStock !== expectedOpening) {
        console.log(`Self-healing stock for item ${itemId} on ${date}: Opening ${existing.openingStock} -> ${expectedOpening}`);
        const newClosing = expectedOpening + (existing.purchased || 0) - (existing.sold || 0) - (existing.wastage || 0);
        
        const [corrected] = await db.update(stock)
          .set({ 
            openingStock: expectedOpening,
            closingStock: newClosing
          })
          .where(eq(stock.id, existing.id))
          .returning();
          
        // Since we changed this record, we must propagate changes to future records
        await this.propagateStockChanges(itemId, date);
        
        return corrected;
      }
      return existing;
    }

    // No record for today, create new one
    const [newRecord] = await db.insert(stock).values({
      itemId,
      date,
      openingStock: expectedOpening,
      purchased: 0,
      sold: 0,
      wastage: 0,
      closingStock: expectedOpening
    }).returning();

    return newRecord;
  }

  // Deprecated: updateDailyStockSales (Removed usage)
  // Deprecated: recalcDailyStockSales (Removed usage)

  async getStock(date?: Date): Promise<(Stock & { item: Item })[]> {
    const d = date || new Date();
    const start = startOfDay(d);
    const end = endOfDay(d);

    // If specific date requested, use getOrInitDailyStock to ensure it exists
    if (date) {
      // For specific date view, we need to ensure records exist for all items? 
      // Or just return what exists? The user might want to see "Today's Stock" even if no transaction happened today.
      // But creating records for ALL items every time someone views stock is expensive.
      // Better: Return existing records, but if the user wants "Today's Stock", the frontend might expect something.
      // However, for now, let's just return what exists, but we can potentially "fill in" gaps on the fly if needed.
      // But standard `getStock` usually just lists table.
      // The issue: "Yesterday's Closing = Today's Opening".
      // If I view stock for Today, and I haven't sold anything, I expect to see Yesterday's closing.
      // But `db.select` won't return anything if no row exists.
      
      // Let's rely on the frontend to handle "missing" rows? 
      // No, the user said "System should derive it".
      // So if I query `getStock(today)`, I should get rows for all active items, populated with rolled-over values.
      
      const allItems = await this.getItems();
      const inventoryItems = allItems.filter(i => i.isIngredient);
      
      const results: (Stock & { item: Item })[] = [];
      
      for (const item of inventoryItems) {
         // This creates the record if missing, ensuring continuity
         const record = await this.getOrInitDailyStock(item.id, d);
         results.push({ ...record, item });
      }
      return results;
    }

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
    
    // Use helper to get or init record with correct opening stock
    const record = await this.getOrInitDailyStock(data.itemId, date);

    const updates: Partial<Stock> = {};
    if (data.type === 'purchase') {
      updates.purchased = (record.purchased || 0) + data.quantity;
    } else if (data.type === 'wastage') {
      updates.wastage = (record.wastage || 0) + data.quantity;
    } else if (data.type === 'opening') {
      // If manually setting opening stock, we override the derived one.
      updates.openingStock = data.quantity;
    }

    const current = { ...record, ...updates };
    updates.closingStock = (current.openingStock || 0) + (current.purchased || 0) - (current.sold || 0) - (current.wastage || 0);

    const [updated] = await db.update(stock)
      .set(updates)
      .where(eq(stock.id, record.id))
      .returning();

    await this.propagateStockChanges(data.itemId, date);
      
    return updated;
  }

  private async getAvailableStock(itemId: number, date: Date): Promise<number> {
    const record = await this.getOrInitDailyStock(itemId, date);
    return (record.closingStock || 0);
  }

  private async consumeIngredient(itemId: number, date: Date, quantity: number): Promise<void> {
    const record = await this.getOrInitDailyStock(itemId, date);
    
    await db.update(stock)
      .set({
        sold: (record.sold || 0) + quantity,
        closingStock: (record.openingStock || 0) + (record.purchased || 0) - ((record.sold || 0) + quantity) - (record.wastage || 0)
      })
      .where(eq(stock.id, record.id));

    await this.propagateStockChanges(itemId, date);
  }

  private async propagateStockChanges(itemId: number, fromDate: Date) {
    const records = await db.select().from(stock)
      .where(and(eq(stock.itemId, itemId), gt(stock.date, endOfDay(fromDate))))
      .orderBy(stock.date);

    if (records.length === 0) return;
    
    // Get the closing stock of the 'fromDate' record (the source of truth)
    const [sourceRecord] = await db.select().from(stock)
      .where(and(eq(stock.itemId, itemId), gte(stock.date, startOfDay(fromDate)), lte(stock.date, endOfDay(fromDate))))
      .limit(1);
      
    if (!sourceRecord) return;

    let previousClosingStock = sourceRecord.closingStock || 0;

    for (const record of records) {
      const newOpening = previousClosingStock;
      const newClosing = newOpening + (record.purchased || 0) - (record.sold || 0) - (record.wastage || 0);
      
      if (record.openingStock !== newOpening || record.closingStock !== newClosing) {
        await db.update(stock)
          .set({
            openingStock: newOpening,
            closingStock: newClosing
          })
          .where(eq(stock.id, record.id));
      }
      
      previousClosingStock = newClosing;
    }
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
      value
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

  private daysBetweenInclusive(from: Date, to: Date) {
    const start = startOfDay(from).getTime();
    const end = endOfDay(to).getTime();
    return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
  }

  private dailyAllocationFor(exp: Expense, date: Date) {
    const d = new Date(date);
    if (!exp.isRecurring) return exp.amount;
    if (exp.frequency === 'daily') return exp.amount;
    if (exp.frequency === 'monthly') {
      const daysInMonth = endOfMonth(d).getDate();
      return Math.round(exp.amount / daysInMonth);
    }
    // yearly
    const startY = startOfMonth(new Date(d.getFullYear(), 0, 1));
    const endY = endOfMonth(new Date(d.getFullYear(), 11, 1));
    const daysInYear = this.daysBetweenInclusive(startY, endY);
    return Math.round(exp.amount / daysInYear);
  }

  async getExpenses(from?: Date, to?: Date): Promise<{
    total: number;
    byCategory: Record<string, number>;
    items: (Expense & { allocatedDaily?: number })[];
  }> {
    const start = from ? startOfDay(from) : startOfMonth(new Date());
    const end = to ? endOfDay(to) : endOfDay(new Date());

    const oneTimeRows = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.isRecurring, false), and(gte(expenses.date, start), lte(expenses.date, end))));

    const recurringRows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.isRecurring, true));

    const items: (Expense & { allocatedDaily?: number })[] = [];
    let total = 0;
    const byCategory: Record<string, number> = {};

    for (const exp of oneTimeRows) {
      total += exp.amount;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
      items.push(exp);
    }

    for (const exp of recurringRows) {
      if (exp.date <= end) {
        const days = this.daysBetweenInclusive(start, end);
        const daily = this.dailyAllocationFor(exp, start);
        const allocated = daily * days;
        total += allocated;
        byCategory[exp.category] = (byCategory[exp.category] || 0) + allocated;
        if (exp.date >= start && exp.date <= end) {
          items.push({ ...exp, allocatedDaily: daily });
        }
      }
    }

    return { total, byCategory, items };
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [row] = await db.insert(expenses).values(expense).returning();
    return row;
  }

  async updateExpense(id: number, updates: Partial<InsertExpense>): Promise<Expense> {
    const [row] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning();
    return row;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getProfit(range: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'daily') {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (range) {
      case 'weekly':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'monthly':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarterly':
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case 'yearly':
        start = startOfMonth(new Date(now.getFullYear(), 0, 1));
        end = endOfMonth(new Date(now.getFullYear(), 11, 1));
        break;
      case 'daily':
      default:
        start = startOfDay(now);
        end = endOfDay(now);
    }

    const salesRows = await db.select({
      date: sales.date,
      quantity: sales.quantity,
      total: sales.total,
      cogs: sales.cogs,
    })
      .from(sales)
      .where(and(gte(sales.date, start), lte(sales.date, end)));

    const totalSales = salesRows.reduce((sum, r) => sum + Number(r.total), 0);
    const totalCOGS = salesRows.reduce((sum, r) => sum + Number(r.cogs || 0), 0);
    const grossProfit = totalSales - totalCOGS;

    const expensesAgg = await this.getExpenses(start, end);
    const totalExpenses = expensesAgg.total;
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // Trend: compute daily net within range
    const days = this.daysBetweenInclusive(start, end);
    const trend: { date: string; net: number }[] = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dStart = startOfDay(day);
      const dEnd = endOfDay(day);
      const dSales = salesRows.filter(r => r.date >= dStart && r.date <= dEnd);
      const dSalesTotal = dSales.reduce((s, r) => s + Number(r.total), 0);
      const dCOGS = dSales.reduce((s, r) => s + Number(r.cogs || 0), 0);
      const dExpenses = expensesAgg.items.reduce((s, e) => {
        if (e.isRecurring) return s + (e.allocatedDaily || 0);
        return s + (e.date >= dStart && e.date <= dEnd ? e.amount : 0);
      }, 0);
      trend.push({ date: dStart.toISOString(), net: dSalesTotal - dCOGS - dExpenses });
    }

    // Alerts
    let consecutiveNetLossDays = 0;
    let currentStreak = 0;
    for (const t of trend) {
      if (t.net < 0) currentStreak += 1;
      else currentStreak = 0;
      consecutiveNetLossDays = Math.max(consecutiveNetLossDays, currentStreak);
    }
    const lastDayExpense = trend.length > 0 ? expensesAgg.items.reduce((s, e) => {
      const dStart = startOfDay(end);
      const dEnd = endOfDay(end);
      if (e.isRecurring) return s + (e.allocatedDaily || 0);
      return s + (e.date >= dStart && e.date <= dEnd ? e.amount : 0);
    }, 0) : 0;
    const avgExpense = totalExpenses / days;
    const expenseSpike = lastDayExpense > avgExpense * 1.5;

    return {
      totalSales,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      netMarginPct,
      trend,
      alerts: { consecutiveNetLossDays, expenseSpike },
    };
  }

  async getRecipeByMenuItem(menuItemId: number): Promise<{ id: number; menuItemId: number; ingredients: RecipeItem[] } | null> {
    const [rec] = await db.select().from(recipes).where(eq(recipes.menuItemId, menuItemId)).limit(1);
    if (!rec) return null;
    const comps = await db.select().from(recipeItems).where(eq(recipeItems.recipeId, rec.id));
    return { id: rec.id, menuItemId: rec.menuItemId, ingredients: comps as any };
  }

  async upsertRecipe(menuItemId: number, ingredients: { ingredientId: number; quantity: number; unit: string }[]): Promise<{ message: string }> {
    const existing = await db.select().from(recipes).where(eq(recipes.menuItemId, menuItemId)).limit(1);
    let recipeId: number;
    if (existing.length > 0) {
      recipeId = existing[0].id;
      await db.delete(recipeItems).where(eq(recipeItems.recipeId, recipeId));
    } else {
      const [created] = await db.insert(recipes).values({ menuItemId }).returning();
      recipeId = created.id;
    }
    if (ingredients.length === 0) {
      throw new Error("A menu item must have at least one ingredient");
    }
    await db.insert(recipeItems).values(ingredients.map(i => ({
      recipeId,
      ingredientId: i.ingredientId,
      quantity: String(i.quantity),
      unit: i.unit,
    })));

    // Update menu item cost price based on ingredients
    let totalCost = 0;
    for (const ing of ingredients) {
      const [item] = await db.select().from(items).where(eq(items.id, ing.ingredientId));
      if (item) {
        totalCost += Number(item.costPrice) * ing.quantity;
      }
    }
    await db.update(items)
      .set({ costPrice: Math.round(totalCost) })
      .where(eq(items.id, menuItemId));

    return { message: "Recipe saved" };
  }

  async deleteRecipe(menuItemId: number): Promise<void> {
    const salesCount = await db.select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(eq(sales.itemId, menuItemId));
    const count = Number(salesCount[0]?.count || 0);
    if (count > 0) {
      throw new Error("Recipe deletion is blocked: sales exist for this item");
    }
    const [rec] = await db.select().from(recipes).where(eq(recipes.menuItemId, menuItemId)).limit(1);
    if (!rec) return;
    await db.delete(recipeItems).where(eq(recipeItems.recipeId, rec.id));
    await db.delete(recipes).where(eq(recipes.id, rec.id));
  }

  async getTables(): Promise<Table[]> {
    return await db.select().from(tables).orderBy(tables.number);
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [created] = await db.insert(tables).values(table).returning();
    return created;
  }

  async updateTable(id: number, updates: Partial<InsertTable>): Promise<Table> {
    const [updated] = await db.update(tables).set(updates).where(eq(tables.id, id)).returning();
    return updated;
  }

  async deleteTable(id: number): Promise<void> {
    await db.delete(tables).where(eq(tables.id, id));
  }

  async getOrders(status?: string): Promise<(Order & { table: Table | null, items: (Sale & { item: Item })[] })[]> {
    let query = db.select().from(orders).leftJoin(tables, eq(orders.tableId, tables.id));
    
    if (status) {
      query.where(eq(orders.status, status));
    }
    
    const result = await query.orderBy(desc(orders.createdAt));
    
    const ordersWithItems = await Promise.all(result.map(async (row) => {
        const orderItems = await db.select({
            id: sales.id,
            orderId: sales.orderId,
            date: sales.date,
            itemId: sales.itemId,
            quantity: sales.quantity,
            unitPrice: sales.unitPrice,
            total: sales.total,
            labels: sales.labels,
            cogs: sales.cogs,
            createdAt: sales.createdAt,
            item: items
        })
        .from(sales)
        .innerJoin(items, eq(sales.itemId, items.id))
        .where(eq(sales.orderId, row.orders.id));
        
        return { ...row.orders, table: row.tables, items: orderItems as any };
    }));
    
    return ordersWithItems;
  }

  async getOrder(id: number): Promise<(Order & { table: Table | null, items: (Sale & { item: Item })[] }) | undefined> {
    const [row] = await db.select().from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .where(eq(orders.id, id));
      
    if (!row) return undefined;
    
    const orderItems = await db.select({
        id: sales.id,
        orderId: sales.orderId,
        date: sales.date,
        itemId: sales.itemId,
        quantity: sales.quantity,
        unitPrice: sales.unitPrice,
        total: sales.total,
        labels: sales.labels,
        cogs: sales.cogs,
        createdAt: sales.createdAt,
        item: items
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .where(eq(sales.orderId, id));
    
    return { ...row.orders, table: row.tables, items: orderItems as any };
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const existing = await db.select().from(orders)
      .where(and(eq(orders.tableId, order.tableId), eq(orders.status, 'OPEN')));
      
    if (existing.length > 0) {
      throw new Error(`Table ${order.tableId} already has an open order`);
    }

    const [created] = await db.insert(orders).values(order).returning();
    await db.update(tables).set({ status: 'occupied' }).where(eq(tables.id, order.tableId));
    return created;
  }

  async updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order> {
    const [updated] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return updated;
  }

  async addItemToOrder(orderId: number, item: InsertSale): Promise<Sale> {
     const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
     if (!order || order.status !== 'OPEN') {
         throw new Error("Order is not open");
     }

     const [sale] = await db.insert(sales).values({ ...item, orderId, cogs: "0" }).returning();
     
     const currentTotal = order.total || 0;
     await db.update(orders).set({ total: currentTotal + sale.total }).where(eq(orders.id, orderId));
     
     return sale;
  }

  async removeItemFromOrder(saleId: number): Promise<void> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));
    if (!sale) return;
    
    if (sale.orderId) {
        const [order] = await db.select().from(orders).where(eq(orders.id, sale.orderId));
        if (order && order.status === 'OPEN') {
             await db.delete(sales).where(eq(sales.id, saleId));
             await db.update(orders).set({ total: (order.total || 0) - sale.total }).where(eq(orders.id, order.id));
        } else {
            throw new Error("Cannot remove item from closed order");
        }
    }
  }

  async closeOrder(id: number, paymentType?: 'CASH'|'CARD'|'CREDIT', customerId?: number): Promise<Order> {
    const orderWithItems = await this.getOrder(id);
    if (!orderWithItems) throw new Error("Order not found");
    if (orderWithItems.status !== 'OPEN') throw new Error("Order is not open");
    
    const now = new Date();
    const allowInsufficient = (await this.getSetting("allow_sale_without_stock")) === "true";

    // Validate Stock First
    for (const saleItem of orderWithItems.items) {
        const recipe = await this.getRecipeByMenuItem(saleItem.itemId);
        if (recipe) {
             for (const comp of recipe.ingredients) {
                const needed = Math.round(Number(comp.quantity) * Number(saleItem.quantity));
                const available = await this.getAvailableStock(comp.ingredientId, now);
                if (!allowInsufficient && available < needed) {
                    throw new Error(`Insufficient stock for ingredient ID ${comp.ingredientId}: need ${needed}, have ${available}`);
                }
             }
        }
    }
    
    // Process Stock Deduction
    for (const saleItem of orderWithItems.items) {
        const recipe = await this.getRecipeByMenuItem(saleItem.itemId);
        let saleCogs = 0;
        
        if (recipe && recipe.ingredients.length > 0) {
            for (const comp of recipe.ingredients) {
              const useQty = Math.round(Number(comp.quantity) * Number(saleItem.quantity));
              await this.consumeIngredient(comp.ingredientId, now, useQty);
              
              const [ing] = await db.select().from(items).where(eq(items.id, comp.ingredientId)).limit(1);
              if (ing) {
                  saleCogs += Number(ing.costPrice) * Number(comp.quantity);
              }
            }
            saleCogs = saleCogs * Number(saleItem.quantity);
        }
        
        await db.update(sales).set({ cogs: String(saleCogs) }).where(eq(sales.id, saleItem.id));
    }
    
    const [closedOrder] = await db.update(orders)
        .set({ status: 'CLOSED', closedAt: now, paymentType: paymentType || 'CASH' })
        .where(eq(orders.id, id))
        .returning();
        
    if (closedOrder.tableId) {
        await db.update(tables).set({ status: 'empty' }).where(eq(tables.id, closedOrder.tableId));
    }
    
    if (paymentType === 'CREDIT') {
      if (!customerId) throw new Error('Customer is required for credit sales');
      await db.insert(receivables).values({
        orderId: closedOrder.id,
        customerId,
        amount: closedOrder.total || 0,
        outstanding: closedOrder.total || 0,
        status: 'OPEN',
      });
    }

    return closedOrder;
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async createCustomer(cust: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(cust).returning();
    return created;
  }

  async getReceivables(status?: 'OPEN'|'SETTLED'): Promise<(Receivable & { customer: Customer })[]> {
    const rows = await db.select({ receivable: receivables, customer: customers })
      .from(receivables)
      .innerJoin(customers, eq(receivables.customerId, customers.id))
      .where(status ? eq(receivables.status, status) : undefined)
      .orderBy(desc(receivables.createdAt));
    return rows.map(r => ({ ...(r.receivable as any), customer: r.customer })) as any;
  }

  async getReceivablesSummary(): Promise<{ totalOutstanding: number; byCustomer: { customerId: number; name: string; outstanding: number }[] }> {
    const list = await this.getReceivables();
    const totalOutstanding = list.reduce((sum, r) => sum + Number(r.outstanding), 0);
    const map = new Map<number, { customerId: number; name: string; outstanding: number }>();
    list.forEach(r => {
      const key = (r as any).customer.id as number;
      const existing = map.get(key) || { customerId: key, name: (r as any).customer.name, outstanding: 0 };
      existing.outstanding += Number(r.outstanding);
      map.set(key, existing);
    });
    return { totalOutstanding, byCustomer: Array.from(map.values()) };
  }

  async createReceivable(orderId: number, customerId: number, amount: number): Promise<Receivable> {
    const [created] = await db.insert(receivables).values({ orderId, customerId, amount, outstanding: amount, status: 'OPEN' }).returning();
    return created;
  }

  async getRevenueByItem(from: Date, to: Date, sort: 'asc'|'desc' = 'desc'): Promise<{ itemId: number; name: string; quantity: number; revenue: number }[]> {
    const start = startOfDay(from);
    const end = endOfDay(to);
    const rows = await db.select({
      itemId: items.id,
      name: items.name,
      quantity: sum(sales.quantity),
      revenue: sum(sales.total),
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .innerJoin(orders, eq(sales.orderId, orders.id))
    .where(and(gte(sales.date, start), lte(sales.date, end), eq(orders.status, 'CLOSED')))
    .groupBy(items.id, items.name)
    .orderBy(sort === 'asc' ? sum(sales.total) : desc(sum(sales.total)));

    return rows.map(r => ({
      itemId: Number(r.itemId),
      name: r.name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }

  async getRevenueSummary(from: Date, to: Date): Promise<{ totalRevenue: number; cashReceived: number; cardReceived: number; creditSales: number }> {
    const start = startOfDay(from);
    const end = endOfDay(to);

    const totalRes = await db.select({ total: sum(sales.total) })
      .from(sales)
      .innerJoin(orders, eq(sales.orderId, orders.id))
      .where(and(gte(sales.date, start), lte(sales.date, end), eq(orders.status, 'CLOSED')));
    const totalRevenue = Number(totalRes[0]?.total) || 0;

    const byPayment = await db.select({
      method: orders.paymentType,
      revenue: sum(sales.total),
    })
    .from(sales)
    .innerJoin(orders, eq(sales.orderId, orders.id))
    .where(and(gte(sales.date, start), lte(sales.date, end), eq(orders.status, 'CLOSED')))
    .groupBy(orders.paymentType);

    let cashReceived = 0, cardReceived = 0, creditSales = 0;
    byPayment.forEach(r => {
      const amt = Number(r.revenue) || 0;
      if (r.method === 'CASH') cashReceived += amt;
      else if (r.method === 'CARD') cardReceived += amt;
      else if (r.method === 'CREDIT') creditSales += amt;
    });

    return { totalRevenue, cashReceived, cardReceived, creditSales };
  }

  async getRevenueByPayment(from: Date, to: Date): Promise<{ method: 'CASH'|'CARD'|'CREDIT'; revenue: number }[]> {
    const start = startOfDay(from);
    const end = endOfDay(to);
    const rows = await db.select({
      method: orders.paymentType,
      revenue: sum(sales.total),
    })
    .from(sales)
    .innerJoin(orders, eq(sales.orderId, orders.id))
    .where(and(gte(sales.date, start), lte(sales.date, end), eq(orders.status, 'CLOSED')))
    .groupBy(orders.paymentType);
    return rows.map(r => ({ method: r.method as any, revenue: Number(r.revenue) || 0 }));
  }

  async recordPayment(receivableId: number, amount: number, method: 'CASH'|'CARD'): Promise<Receivable> {
    const [rec] = await db.select().from(receivables).where(eq(receivables.id, receivableId));
    if (!rec) throw new Error('Receivable not found');
    if (amount <= 0) throw new Error('Amount must be positive');

    await db.insert(payments).values({ receivableId, amount, method });
    const newOutstanding = Math.max(0, (rec.outstanding || 0) - amount);
    const newStatus = newOutstanding === 0 ? 'SETTLED' : 'OPEN';

    const [updated] = await db.update(receivables)
      .set({ outstanding: newOutstanding, status: newStatus, updatedAt: new Date() })
      .where(eq(receivables.id, receivableId))
      .returning();

    if (method === 'CASH') {
      const currentCash = Number((await this.getSetting('cash_balance')) || '0');
      await this.setSetting('cash_balance', String(currentCash + amount));
    } else {
      const currentBank = Number((await this.getSetting('bank_balance')) || '0');
      await this.setSetting('bank_balance', String(currentBank + amount));
    }

    return updated;
  }
}

export const storage = new DatabaseStorage();
