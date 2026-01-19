import { storage } from "../storage";
import { api } from "../../shared/routes";

export async function listSales(date?: Date, limit: number = 50) {
  return await storage.getSales(date, limit);
}

export async function listSalesRange(from?: Date, to?: Date, limit: number = 100) {
  return await storage.getSalesRange(from, to, limit);
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

export async function updateSaleFromBody(id: number, body: any) {
  const raw = { ...body };
  const updates = api.sales.update.input.parse({
    ...raw,
    itemId: raw.itemId !== undefined ? Number(raw.itemId) : undefined,
    quantity: raw.quantity !== undefined ? Number(raw.quantity) : undefined,
    unitPrice: raw.unitPrice !== undefined ? Number(raw.unitPrice) : undefined,
    total: raw.total !== undefined ? Number(raw.total) : undefined,
    date: raw.date ? new Date(raw.date) : undefined,
    labels: raw.labels || undefined,
  });
  return await storage.updateSale(id, updates as any);
}

export async function listSalesByQuery(params?: { date?: string; from?: string; to?: string; limit?: string | number }) {
  const limit = params?.limit ? Number(params.limit) : 50;
  if (params?.from || params?.to) {
    const from = params?.from ? new Date(`${params.from}T00:00:00`) : undefined;
    const to = params?.to ? new Date(`${params.to}T00:00:00`) : undefined;
    return await listSalesRange(from, to, limit);
  }
  const date = params?.date ? new Date(`${params.date}T00:00:00`) : undefined;
  return await listSales(date, limit);
}
