import { storage } from "../storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function getRecipeByMenuItem(menuItemId: number) {
  return await storage.getRecipeByMenuItem(menuItemId);
}

export async function upsertRecipeFromBody(body: any) {
  const input = api.recipes.upsert.input.parse({
    ...body,
    menuItemId: Number(body.menuItemId),
    ingredients: (body.ingredients || []).map((i: any) => ({
      ingredientId: Number(i.ingredientId),
      quantity: Number(i.quantity),
      unit: String(i.unit),
    })),
  });
  return await storage.upsertRecipe(input.menuItemId, input.ingredients);
}

export async function deleteRecipeForMenuItem(menuItemId: number) {
  return await storage.deleteRecipe(menuItemId);
}

