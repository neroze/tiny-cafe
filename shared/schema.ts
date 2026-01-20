import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Snacks, Drinks, Main
  unit: text("unit").default("pcs"),
  isIngredient: boolean("is_ingredient").default(false),
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
  cogs: decimal("cogs", { precision: 12, scale: 2 }).default("0"),
  labels: text("labels").array().default(sql`ARRAY[]::text[]`),
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

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  category: text("category").notNull(), // Rent, Salary, Utilities, Supplies, Maintenance, Misc
  description: text("description").default(""),
  amount: integer("amount").notNull(), // in cents/paisa
  isRecurring: boolean("is_recurring").default(false),
  frequency: text("frequency").default("daily"), // daily | monthly | yearly
  createdAt: timestamp("created_at").defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").references(() => items.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recipeItems = pgTable("recipe_items", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").references(() => recipes.id).notNull(),
  ingredientId: integer("ingredient_id").references(() => items.id).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit").notNull(), // ml, g, pcs
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

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  menuItem: one(items, {
    fields: [recipes.menuItemId],
    references: [items.id],
  }),
  components: many(recipeItems),
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeItems.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(items, {
    fields: [recipeItems.ingredientId],
    references: [items.id],
  }),
}));

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(sales, {
  date: z.coerce.date(),
}).omit({ id: true, createdAt: true });
export const insertStockSchema = createInsertSchema(stock, {
  date: z.coerce.date(),
}).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses, {
  date: z.coerce.date(),
}).omit({ id: true, createdAt: true });
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true });
export const insertRecipeItemSchema = createInsertSchema(recipeItems).omit({ id: true });

// Types
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Stock = typeof stock.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type RecipeItem = typeof recipeItems.$inferSelect;
export type InsertRecipeItem = z.infer<typeof insertRecipeItemSchema>;

export type CreateSaleRequest = InsertSale;
export type CreateStockTransactionRequest = {
  itemId: number;
  type: 'purchase' | 'wastage' | 'opening';
  quantity: number;
  date?: string; // ISO string
};
