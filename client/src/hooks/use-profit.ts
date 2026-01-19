import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useProfit(range?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
  return useQuery({
    queryKey: [api.dashboard.profit.path, range],
    queryFn: async () => {
      const url = range ? `${api.dashboard.profit.path}?range=${range}` : api.dashboard.profit.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profit stats");
      return api.dashboard.profit.responses[200].parse(await res.json());
    },
  });
}

