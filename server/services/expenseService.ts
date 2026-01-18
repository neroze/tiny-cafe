import { storage } from "../storage";
import { api } from "../../shared/routes";
import { z } from "zod";

export async function listExpenses(from?: Date, to?: Date) {
  const data = await storage.getExpenses(from, to);
  return {
    total: Number(data.total),
    byCategory: Object.fromEntries(Object.entries(data.byCategory).map(([k, v]) => [k, Number(v)])),
    items: data.items.map(e => ({
      id: (e as any).id,
      date: ((e.isRecurring && from) ? from : (e.date as Date)).toISOString(),
      category: e.category,
      description: e.description || "",
      amount: Number(e.amount),
      isRecurring: e.isRecurring || false,
      frequency: (e as any).frequency || "daily",
      allocatedDaily: (e as any).allocatedDaily !== undefined ? Number((e as any).allocatedDaily) : undefined,
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
  const payload: any = { ...body };
  if (payload.amount !== undefined) {
    payload.amount = Number(payload.amount);
  }
  const input = api.expenses.update.input.parse(payload);
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

export async function listExpensesByQuery(params?: { from?: string; to?: string }) {
  const from = params?.from ? new Date(`${params.from}T00:00:00`) : undefined;
  const to = params?.to ? new Date(`${params.to}T00:00:00`) : undefined;
  return await listExpenses(from, to);
}
