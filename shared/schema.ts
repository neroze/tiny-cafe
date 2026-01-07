import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Snacks, Drinks, Main
  costPrice: integer("cost_price").notNull(), // in cents/paisa
  sellingPrice: integer("selling_price").notNull(), // in cents/paisa
  minStock: integer("min_stock").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // Snapshot of price at sale time
  total: integer("total").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stock = pgTable("stock", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  openingStock: integer("opening_stock").default(0),
  purchased: integer("purchased").default(0),
  sold: integer("sold").default(0), // Populated from sales
  wastage: integer("wastage").default(0),
  closingStock: integer("closing_stock").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const itemsRelations = relations(items, ({ many }) => ({
  sales: many(sales),
  stock: many(stock),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  item: one(items, {
    fields: [sales.itemId],
    references: [items.id],
  }),
}));

export const stockRelations = relations(stock, ({ one }) => ({
  item: one(items, {
    fields: [stock.itemId],
    references: [items.id],
  }),
}));

// Schemas
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertStockSchema = createInsertSchema(stock).omit({ id: true, createdAt: true });

// Types
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Stock = typeof stock.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;

export type CreateSaleRequest = InsertSale;
export type CreateStockTransactionRequest = {
  itemId: number;
  type: 'purchase' | 'wastage' | 'opening';
  quantity: number;
  date?: string; // ISO string
};
