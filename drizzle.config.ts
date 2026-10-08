import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Nest, so it loads .env itself (Node 22 built-in).
process.loadEnvFile();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
