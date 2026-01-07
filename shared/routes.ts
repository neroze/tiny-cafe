import { z } from 'zod';
import { insertItemSchema, insertSaleSchema, items, sales, stock } from './schema';

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
        date: z.string().optional(), // Filter by date
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
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard',
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
