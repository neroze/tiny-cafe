import { storage } from "../storage";
import { api } from "../../shared/routes";
import { z } from "zod";

export async function listItems() {
  return await storage.getItems();
}

export async function getItemById(id: number) {
  const item = await storage.getItem(id);
  if (!item) return undefined;
  return item;
}

export async function createItemFromBody(body: any) {
  const input = api.items.create.input.parse({
    ...body,
    costPrice: Number(body?.costPrice),
    sellingPrice: Number(body?.sellingPrice),
    minStock: Number(body?.minStock || 0),
  });
  return await storage.createItem(input);
}

export async function updateItemFromBody(id: number, body: any) {
  const input = api.items.update.input.parse({
    ...body,
    costPrice: body.costPrice !== undefined ? Number(body.costPrice) : undefined,
    sellingPrice: body.sellingPrice !== undefined ? Number(body.sellingPrice) : undefined,
    minStock: body.minStock !== undefined ? Number(body.minStock) : undefined,
  });
  return await storage.updateItem(id, input);
}

export async function deleteItemById(id: number) {
  await storage.deleteItem(id);
}
