import { storage } from "../storage";
import { api } from "../../shared/routes";
import { z } from "zod";

export async function listExpenses(from?: Date, to?: Date) {
  const data = await storage.getExpenses(from, to);
  return {
    total: data.total,
    byCategory: data.byCategory,
    items: data.items.map(e => ({
      id: (e as any).id,
      date: (e.date as Date).toISOString(),
      category: e.category,
      description: e.description || "",
      amount: e.amount,
      isRecurring: e.isRecurring || false,
      frequency: (e as any).frequency || "daily",
      allocatedDaily: (e as any).allocatedDaily,
    })),
  };
}

export async function createExpenseFromBody(body: any) {
  const input = api.expenses.create.input.parse({
    ...body,
    amount: Number(body?.amount),
    isRecurring: Boolean(body?.isRecurring),
  });
  return await storage.createExpense(input);
}

export async function updateExpenseFromBody(id: number, body: any) {
  const input = api.expenses.update.input.parse(body);
  return await storage.updateExpense(id, input);
}

export async function deleteExpenseById(id: number) {
  await storage.deleteExpense(id);
}

export async function getExpenseCategories() {
  const catsStr = await storage.getSetting("configured_expense_categories");
  return catsStr ? JSON.parse(catsStr) : ["Rent", "Salary", "Utilities", "Supplies", "Maintenance", "Misc"];
}

export async function addExpenseCategory(category: string) {
  if (!category) throw new z.ZodError([{ path: ["category"], message: "Category required", code: "custom" } as any]);
  const catsStr = await storage.getSetting("configured_expense_categories");
  let cats = catsStr ? JSON.parse(catsStr) : ["Rent", "Salary", "Utilities", "Supplies", "Maintenance", "Misc"];
  if (!cats.includes(category)) {
    cats.push(category);
    await storage.setSetting("configured_expense_categories", JSON.stringify(cats));
  }
  return cats;
}

export async function removeExpenseCategory(category: string) {
  const catsStr = await storage.getSetting("configured_expense_categories");
  let cats = catsStr ? JSON.parse(catsStr) : ["Rent", "Salary", "Utilities", "Supplies", "Maintenance", "Misc"];
  cats = cats.filter((c: string) => c !== category);
  await storage.setSetting("configured_expense_categories", JSON.stringify(cats));
  return cats;
}

