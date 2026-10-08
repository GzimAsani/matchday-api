import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../config/env.js';
import { DB, PG_CLIENT, type Database, type PgClient } from './database.js';

// Global because nearly every feature module needs the database.
@Global()
@Module({
  providers: [
    {
      provide: PG_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PgClient =>
        postgres(config.get('DATABASE_URL', { infer: true })),
    },
    {
      provide: DB,
      inject: [PG_CLIENT],
      useFactory: (client: PgClient): Database => drizzle({ client }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_CLIENT) private readonly client: PgClient) {}

  // Close the pool so restarts and deploys don't leave connections open.
  async onApplicationShutdown() {
    await this.client.end();
  }
}
