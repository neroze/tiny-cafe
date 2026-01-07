import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertItem } from "@shared/routes";

export function useItems() {
  return useQuery({
    queryKey: [api.items.list.path],
    queryFn: async () => {
      const res = await fetch(api.items.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return api.items.list.responses[200].parse(await res.json());
    },
  });
}

export function useItem(id: number) {
  return useQuery({
    queryKey: [api.items.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.items.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch item");
      return api.items.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertItem) => {
      // Ensure prices are numbers
      const payload = {
        ...data,
        costPrice: Number(data.costPrice),
        sellingPrice: Number(data.sellingPrice),
        minStock: Number(data.minStock || 0),
      };
      
      const validated = api.items.create.input.parse(payload);
      const res = await fetch(api.items.create.path, {
        method: api.items.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.items.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create item");
      }
      return api.items.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.items.list.path] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertItem>) => {
      const validated = api.items.update.input.parse(updates);
      const url = buildUrl(api.items.update.path, { id });
      const res = await fetch(url, {
        method: api.items.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update item");
      return api.items.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.items.list.path] }),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.items.delete.path, { id });
      const res = await fetch(url, { 
        method: api.items.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.items.list.path] }),
  });
}
