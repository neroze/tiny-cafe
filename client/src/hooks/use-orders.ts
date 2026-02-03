import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertOrder, InsertSale } from "@shared/schema";

export function useOrders(status?: string) {
  return useQuery({
    queryKey: [api.orders.list.path, status],
    queryFn: async () => {
      const url = status 
          ? `${api.orders.list.path}?status=${status}` 
          : api.orders.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return api.orders.list.responses[200].parse(await res.json());
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: [api.orders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.orders.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch order");
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 5000, // Auto-refresh active order
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertOrder) => {
      const payload = {
          ...data,
          tableId: Number(data.tableId)
      };
      const validated = api.orders.create.input.parse(payload);
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.orders.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create order");
      }
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.tables.list.path] });
    },
  });
}

export function useAddItemToOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, item }: { orderId: number, item: any }) => {
        // item should match InsertSale (without date/labels if they are auto)
        // But API expects full body
        const url = buildUrl(api.orders.addItem.path, { id: orderId });
        const res = await fetch(url, {
            method: api.orders.addItem.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
            credentials: "include",
        });
        
        if (!res.ok) {
          try {
            const err = await res.json();
            throw new Error(err?.message || "Failed to add item");
          } catch {
            throw new Error("Failed to add item");
          }
        }
        return api.orders.addItem.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: [api.orders.get.path, variables.orderId] });
        queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    }
  });
}

export function useRemoveItemFromOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, itemId }: { orderId: number, itemId: number }) => {
            const url = buildUrl(api.orders.removeItem.path, { id: itemId });
            const res = await fetch(url, {
                method: api.orders.removeItem.method,
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to remove item");
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [api.orders.get.path, variables.orderId] });
            queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
        }
    });
}

export function useCloseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, paymentType, customerId }: { orderId: number; paymentType: 'CASH'|'CARD'|'CREDIT'; customerId?: number }) => {
            const url = buildUrl(api.orders.close.path, { id: orderId });
            const payload = api.orders.close.input.parse({ paymentType, customerId });
            const res = await fetch(url, {
                method: api.orders.close.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to close order");
            }
            return api.orders.close.responses[200].parse(await res.json());
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [api.orders.get.path, variables.orderId] });
            queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.tables.list.path] });
        }
    });
}
