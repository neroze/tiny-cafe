import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertTable } from "@shared/schema";

export function useTables() {
  return useQuery({
    queryKey: [api.tables.list.path],
    queryFn: async () => {
      const res = await fetch(api.tables.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tables");
      return api.tables.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTable) => {
      const payload = {
          ...data,
          number: Number(data.number),
          capacity: Number(data.capacity || 4)
      };
      const validated = api.tables.create.input.parse(payload);
      const res = await fetch(api.tables.create.path, {
        method: api.tables.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.tables.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create table");
      }
      return api.tables.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.tables.list.path] }),
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertTable>) => {
      const validated = api.tables.update.input.parse(updates);
      const url = buildUrl(api.tables.update.path, { id });
      const res = await fetch(url, {
        method: api.tables.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update table");
      return api.tables.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.tables.list.path] }),
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tables.delete.path, { id });
      const res = await fetch(url, { 
        method: api.tables.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete table");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.tables.list.path] }),
  });
}
