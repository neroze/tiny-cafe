import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useRecipe(menuItemId: number) {
  return useQuery({
    queryKey: [api.recipes.getByMenuItem.path, menuItemId],
    queryFn: async () => {
      const url = buildUrl(api.recipes.getByMenuItem.path, { menuItemId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recipe");
      return api.recipes.getByMenuItem.responses[200].parse(await res.json());
    },
    enabled: !!menuItemId,
  });
}

export function useUpsertRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { menuItemId: number; ingredients: { ingredientId: number; quantity: number; unit: string }[] }) => {
      const validated = api.recipes.upsert.input.parse(data);
      const res = await fetch(api.recipes.upsert.path, {
        method: api.recipes.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = api.recipes.upsert.responses[400].parse(await res.json());
        throw new Error(error.message);
      }
      return api.recipes.upsert.responses[201].parse(await res.json());
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.recipes.getByMenuItem.path, vars.menuItemId] });
    },
  });
}

