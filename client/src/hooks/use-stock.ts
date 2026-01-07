import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type TransactionInput = z.infer<typeof api.stock.transaction.input>;

export function useStock(date?: string) {
  return useQuery({
    queryKey: [api.stock.list.path, date],
    queryFn: async () => {
      const url = date 
        ? `${api.stock.list.path}?date=${date}` 
        : api.stock.list.path;
        
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stock");
      return api.stock.list.responses[200].parse(await res.json());
    },
  });
}

export function useStockTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TransactionInput) => {
      const validated = api.stock.transaction.input.parse(data);
      const res = await fetch(api.stock.transaction.path, {
        method: api.stock.transaction.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to process transaction");
      return api.stock.transaction.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stock.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
