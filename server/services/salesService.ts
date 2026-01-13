import { storage } from "../storage";
import { api } from "../../shared/routes";

export async function listSales(date?: Date, limit: number = 50) {
  return await storage.getSales(date, limit);
}

export async function createSaleFromBody(body: any) {
  const raw = { ...body };
  const itemId = Number(raw.itemId);
  const quantity = Number(raw.quantity);
  const unitPrice = Number(raw.unitPrice);
  const total = Number(raw.total);
  let date: Date;
  if (raw.date) {
    date = new Date(raw.date);
    if (isNaN(date.getTime())) date = new Date();
  } else {
    date = new Date();
  }
  const input = api.sales.create.input.parse({
    ...raw,
    itemId,
    quantity,
    unitPrice,
    total,
    date,
    labels: raw.labels || [],
  });
  return await storage.createSale(input);
}

