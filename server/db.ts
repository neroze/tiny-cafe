import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Supabase Postgres URL must be set in SUPABASE_DB_URL or DATABASE_URL");
}

const needsSSL =
  connectionString.includes("sslmode=require") ||
  connectionString.includes("supabase.co");

export const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });
