import { Injectable } from '@nestjs/common';
import { FootballDataOrgProvider } from './football-data/football-data.provider.js';
import { OpenLigaDbProvider } from './openligadb/openligadb.provider.js';
import type { DataProvider, FootballDataProvider } from './provider.types.js';

// Picks the adapter for a competition's provider. Callers only see the
// FootballDataProvider interface, never a concrete adapter.
@Injectable()
export class ProviderRegistry {
  private readonly adapters: Map<DataProvider, FootballDataProvider>;

  constructor(
    footballDataProvider: FootballDataOrgProvider,
    openLigaDbProvider: OpenLigaDbProvider,
  ) {
    this.adapters = new Map<DataProvider, FootballDataProvider>([
      [footballDataProvider.name, footballDataProvider],
      [openLigaDbProvider.name, openLigaDbProvider],
    ]);
  }

  get(name: DataProvider): FootballDataProvider {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`No adapter registered for provider "${name}"`);
    }
    return adapter;
  }
}
