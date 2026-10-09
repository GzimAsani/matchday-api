import type { dataProvider, matchStatus } from '../database/schema.js';

export type DataProvider = (typeof dataProvider.enumValues)[number];
export type MatchStatus = (typeof matchStatus.enumValues)[number];
export type MatchWinner = 'home' | 'away' | 'draw';

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
  // Score after 90 minutes: extra time and penalties don't count.
  homeScore: number | null;
  awayScore: number | null;
  // Who won overall, including extra time and penalties. Null until finished.
  winner: MatchWinner | null;
}

export interface FootballDataProvider {
  readonly name: DataProvider;
  getSeasonMatches(
    competitionExternalId: string,
    season: number,
  ): Promise<ProviderMatch[]>;
}
