import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useDashboardStats(range?: 'weekly' | 'monthly' | 'quarterly') {
  return useQuery({
    queryKey: [api.dashboard.stats.path, range],
    queryFn: async () => {
      const url = range ? buildUrl(api.dashboard.stats.path, { range }) : api.dashboard.stats.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.dashboard.stats.responses[200].parse(await res.json());
    },
    // Refresh often to show live sales updates
    refetchInterval: 30000,
  });
}
