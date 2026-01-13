import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type ExpenseInput = z.infer<typeof api.expenses.create.input>;

export function useExpenses(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [api.expenses.list.path, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.from) searchParams.set("from", params.from);
      if (params?.to) searchParams.set("to", params.to);
      const url = params ? `${api.expenses.list.path}?${searchParams.toString()}` : api.expenses.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return api.expenses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExpenseInput) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
        isRecurring: Boolean(data.isRecurring),
      };
      const validated = api.expenses.create.input.parse(payload);
      const res = await fetch(api.expenses.create.path, {
        method: api.expenses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create expense");
      return api.expenses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] }),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<ExpenseInput>) => {
      const validated = api.expenses.update.input.parse(updates);
      const res = await fetch(`${api.expenses.update.path.replace(":id", String(id))}`, {
        method: api.expenses.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update expense");
      return api.expenses.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${api.expenses.delete.path.replace(":id", String(id))}`, {
        method: api.expenses.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] }),
  });
}

