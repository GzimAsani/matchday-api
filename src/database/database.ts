import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';
import type * as schema from './schema.js';

// Injection tokens. The connection pool and the Drizzle instance aren't
// classes, so Nest needs a unique key to register and inject them by.
export const PG_CLIENT = Symbol('PG_CLIENT');
export const DB = Symbol('DB');

export type PgClient = Sql;
export type Database = PostgresJsDatabase<typeof schema>;
