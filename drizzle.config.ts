import { defineConfig } from "drizzle-kit";

const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error("Set SUPABASE_DB_URL or DATABASE_URL to your Supabase Postgres connection string");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DB_URL,
  },
});
