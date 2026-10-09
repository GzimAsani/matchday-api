import { Module } from '@nestjs/common';
import { FootballDataOrgProvider } from './football-data/football-data.provider.js';
import { OpenLigaDbProvider } from './openligadb/openligadb.provider.js';
import { ProviderRegistry } from './provider-registry.js';

// The adapters stay private to this module; other modules reach them only
// through the registry.
@Module({
  providers: [FootballDataOrgProvider, OpenLigaDbProvider, ProviderRegistry],
  exports: [ProviderRegistry],
})
export class ProvidersModule {}
