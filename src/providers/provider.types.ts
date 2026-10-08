import type { dataProvider, matchStatus } from '../database/schema.js';

export type DataProvider = (typeof dataProvider.enumValues)[number];
export type MatchStatus = (typeof matchStatus.enumValues)[number];

// The one shape every provider adapter returns. The sync job only sees this,
// never a provider's own format.
export interface ProviderTeam {
  externalId: string;
  name: string;
  shortName: string | null;
  tla: string | null;
  crestUrl: string | null;
}

export interface ProviderMatch {
  externalId: string;
  season: number;
  matchday: number | null;
  stage: string | null;
  homeTeam: ProviderTeam;
  awayTeam: ProviderTeam;
  kickoff: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

export interface FootballDataProvider {
  readonly name: DataProvider;
  getSeasonMatches(
    competitionExternalId: string,
    season: number,
  ): Promise<ProviderMatch[]>;
}
