import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useReceivables(status?: 'OPEN'|'SETTLED') {
  return useQuery({
    queryKey: [api.receivables.list.path, status],
    queryFn: async () => {
      const url = status ? `${api.receivables.list.path}?status=${status}` : api.receivables.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch receivables");
      return api.receivables.list.responses[200].parse(await res.json());
    },
  });
}

export function useRecordReceivablePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, method }: { id: number; amount: number; method: 'CASH'|'CARD' }) => {
      const validated = api.receivables.pay.input.parse({ amount, method });
      const url = api.receivables.pay.path.replace(":id", String(id));
      const res = await fetch(url, {
        method: api.receivables.pay.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Failed to record payment");
      }
      return api.receivables.pay.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.receivables.list.path] });
    },
  });
}

