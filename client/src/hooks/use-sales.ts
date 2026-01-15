import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useSales(params?: { date?: string; from?: string; to?: string; limit?: string }) {
  return useQuery({
    queryKey: [api.sales.list.path, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.date) searchParams.set("date", params.date);
      if (params?.from) searchParams.set("from", params.from);
      if (params?.to) searchParams.set("to", params.to);
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
    mutationFn: async (data: any) => {
      // Ensure date is ISO string if it's a Date object
      const payload = {
        ...data,
        date: data.date instanceof Date ? data.date.toISOString() : data.date,
        itemId: Number(data.itemId),
        quantity: Number(data.quantity),
        unitPrice: Number(data.unitPrice),
        total: Number(data.total),
      };
      
      const res = await fetch(api.sales.create.path, {
        method: api.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
