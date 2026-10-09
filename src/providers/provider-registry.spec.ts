import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { FootballDataOrgProvider } from './football-data/football-data.provider.js';
import { OpenLigaDbProvider } from './openligadb/openligadb.provider.js';
import { ProviderRegistry } from './provider-registry.js';
import type { DataProvider } from './provider.types.js';

// FootballDataOrgProvider reads its API key from config, so give it a fake one.
const config = {
  get: () => 'test-key',
} as unknown as ConfigService<Env, true>;

describe('ProviderRegistry', () => {
  const footballData = new FootballDataOrgProvider(config);
  const openLigaDb = new OpenLigaDbProvider();
  const registry = new ProviderRegistry(footballData, openLigaDb);

  it('returns the OpenLigaDB adapter for openligadb', () => {
    expect(registry.get('openligadb')).toBe(openLigaDb);
  });

  it('returns the football-data.org adapter for football_data', () => {
    expect(registry.get('football_data')).toBe(footballData);
  });

  it('throws a clear error for an unknown provider', () => {
    expect(() => registry.get('nonsense' as DataProvider)).toThrow(
      'No adapter registered for provider "nonsense"',
    );
  });
});
