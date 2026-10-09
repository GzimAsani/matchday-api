import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { FootballDataOrgProvider } from './football-data/football-data.provider.js';
import { OpenLigaDbProvider } from './openligadb/openligadb.provider.js';
import { ProviderRegistry } from './provider-registry.js';
import { ProvidersModule } from './providers.module.js';

// Lets real Nest DI build the module, which catches wiring mistakes
// (e.g. a constructor asking for an interface) that unit tests can't.
describe('ProvidersModule', () => {
  it('wires every adapter into the registry', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ FOOTBALL_DATA_API_KEY: 'test-key' })],
        }),
        ProvidersModule,
      ],
    }).compile();

    const registry = moduleRef.get(ProviderRegistry);

    expect(registry.get('football_data')).toBeInstanceOf(
      FootballDataOrgProvider,
    );
    expect(registry.get('openligadb')).toBeInstanceOf(OpenLigaDbProvider);
  });
});
