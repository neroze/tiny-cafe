import { storage } from "../storage";
import { api } from "../../shared/routes";

export async function listStock(date?: Date) {
  const d = date || new Date();
  return await storage.getStock(d);
}

export async function recordStockTransactionFromBody(body: any) {
  const input = api.stock.transaction.input.parse({
    ...body,
    itemId: Number(body.itemId),
    quantity: Number(body.quantity),
  });
  return await storage.recordStockTransaction(input);
}

