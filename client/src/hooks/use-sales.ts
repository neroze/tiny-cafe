import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertSale } from "@shared/routes";

export function useSales(params?: { date?: string; limit?: string }) {
  return useQuery({
    queryKey: [api.sales.list.path, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.date) searchParams.set("date", params.date);
      if (params?.limit) searchParams.set("limit", params.limit);
      
      const url = `${api.sales.list.path}?${searchParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales");
      return api.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSale) => {
      const validated = api.sales.create.input.parse(data);
      const res = await fetch(api.sales.create.path, {
        method: api.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.sales.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to record sale");
      }
      return api.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.stock.list.path] });
    },
  });
}
