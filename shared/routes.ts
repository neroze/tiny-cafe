import { z } from 'zod';
import { insertItemSchema, insertSaleSchema, items, sales, stock, expenses, insertExpenseSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  items: {
    list: {
      method: 'GET' as const,
      path: '/api/items',
      responses: {
        200: z.array(z.custom<typeof items.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/items/:id',
      responses: {
        200: z.custom<typeof items.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/items',
      input: insertItemSchema,
      responses: {
        201: z.custom<typeof items.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/items/:id',
      input: insertItemSchema.partial(),
      responses: {
        200: z.custom<typeof items.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/items/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  sales: {
    list: {
      method: 'GET' as const,
      path: '/api/sales',
      input: z.object({
        date: z.string().optional(), // Filter by single date
        from: z.string().optional(), // Filter by range start
        to: z.string().optional(),   // Filter by range end
        limit: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof sales.$inferSelect & { item: typeof items.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sales',
      input: insertSaleSchema,
      responses: {
        201: z.custom<typeof sales.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  stock: {
    list: {
      method: 'GET' as const,
      path: '/api/stock',
      input: z.object({
        date: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof stock.$inferSelect & { item: typeof items.$inferSelect }>()),
      },
    },
    transaction: {
      method: 'POST' as const,
      path: '/api/stock/transaction',
      input: z.object({
        itemId: z.number(),
        type: z.enum(['purchase', 'wastage', 'opening']),
        quantity: z.number(),
        date: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof stock.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses',
      input: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional(),
      responses: {
        200: z.object({
          total: z.number(),
          byCategory: z.record(z.string(), z.number()),
          items: z.array(z.object({
            id: z.number(),
            date: z.string(),
            category: z.string(),
            description: z.string(),
            amount: z.number(),
            isRecurring: z.boolean(),
            frequency: z.enum(['daily', 'monthly', 'yearly']),
            allocatedDaily: z.number().optional(),
          })),
        }),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses',
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/expenses/:id',
      input: insertExpenseSchema.partial(),
      responses: {
        200: z.custom<typeof expenses.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expenses/:id',
      responses: {
        204: z.void(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard',
      input: z.object({
        range: z.enum(['weekly', 'monthly', 'quarterly']).optional(),
      }).optional(),
      responses: {
        200: z.object({
          dailySales: z.number(),
          weeklySales: z.number(),
          monthlySales: z.number(),
          quarterlySales: z.number(),
          topItems: z.array(z.object({
            name: z.string(),
            quantity: z.number(),
            total: z.number(),
          })),
          itemSalesTrend: z.array(z.object({
            date: z.string(),
            items: z.record(z.string(), z.number()),
          })),
          labelDistribution: z.array(z.object({
            name: z.string(),
            value: z.number(),
          })),
        }),
      },
    },
    export: {
      method: 'GET' as const,
      path: '/api/dashboard/export',
      input: z.object({
        from: z.string(),
        to: z.string(),
      }),
      responses: {
        200: z.any(),
      },
    },
    get_targets: {
      method: 'GET' as const,
      path: '/api/dashboard/targets',
      responses: {
        200: z.object({
          weekly: z.number(),
          monthly: z.number(),
          quarterly: z.number(),
        }),
      },
    },
    update_targets: {
      method: 'POST' as const,
      path: '/api/dashboard/targets',
      input: z.object({
        weekly: z.number(),
        monthly: z.number(),
        quarterly: z.number(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    labels: {
      method: 'GET' as const,
      path: '/api/sales/labels',
      responses: {
        200: z.array(z.string()),
      },
    },
    profit: {
      method: 'GET' as const,
      path: '/api/dashboard/profit',
      input: z.object({
        range: z.enum(['daily','weekly','monthly','quarterly','yearly']).optional(),
      }).optional(),
      responses: {
        200: z.object({
          totalSales: z.number(),
          totalCOGS: z.number(),
          grossProfit: z.number(),
          totalExpenses: z.number(),
          netProfit: z.number(),
          netMarginPct: z.number(),
          trend: z.array(z.object({
            date: z.string(),
            net: z.number(),
          })),
          alerts: z.object({
            consecutiveNetLossDays: z.number(),
            expenseSpike: z.boolean(),
          }),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
