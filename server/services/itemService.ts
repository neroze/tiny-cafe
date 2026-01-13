import { storage } from "../storage";
import { api } from "../../shared/routes";
import { z } from "zod";

export async function listItems() {
  return await storage.getItems();
}

export async function getItemById(id: number) {
  return await storage.getItem(id);
}

export async function createItemFromBody(body: any) {
  const input = api.items.create.input.parse(body);
  return await storage.createItem(input);
}

export async function updateItemFromBody(id: number, body: any) {
  const input = api.items.update.input.parse(body);
  return await storage.updateItem(id, input);
}

export async function deleteItemById(id: number) {
  await storage.deleteItem(id);
}

