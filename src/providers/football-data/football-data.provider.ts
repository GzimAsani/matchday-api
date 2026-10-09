import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import type {
  FootballDataProvider,
  MatchStatus,
  MatchWinner,
  ProviderMatch,
  ProviderTeam,
} from '../provider.types.js';
import {
  footballDataMatchesResponseSchema,
  type FootballDataMatch,
  type FootballDataStatus,
  type FootballDataTeam,
} from './football-data.schema.js';

const BASE_URL = 'https://api.football-data.org/v4';

const STATUS: Record<FootballDataStatus, MatchStatus> = {
  SCHEDULED: 'scheduled',
  TIMED: 'scheduled', // scheduled with a confirmed kickoff time
  IN_PLAY: 'live',
  PAUSED: 'paused', // half time
  FINISHED: 'finished',
  AWARDED: 'finished', // result decided by officials
  POSTPONED: 'postponed',
  SUSPENDED: 'postponed', // stopped mid-match, to be finished later
  CANCELLED: 'cancelled',
};

const WINNER = {
  HOME_TEAM: 'home',
  AWAY_TEAM: 'away',
  DRAW: 'draw',
} as const satisfies Record<string, MatchWinner>;

// Premier League and Champions League data. The free plan allows about
// 10 requests a minute; every response says how many are left.
@Injectable()
export class FootballDataOrgProvider implements FootballDataProvider {
  readonly name = 'football_data' as const;

  private readonly apiKey: string;
  private requestsLeft = Infinity;
  private quotaResetsAt = 0;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('FOOTBALL_DATA_API_KEY', { infer: true });
  }

  // competitionExternalId is the competition code, e.g. 'PL' or 'CL'.
  async getSeasonMatches(
    competitionExternalId: string,
    season: number,
  ): Promise<ProviderMatch[]> {
    const body = await this.get(
      `/competitions/${competitionExternalId}/matches?season=${season}`,
    );
    const { matches } = footballDataMatchesResponseSchema.parse(body);
    return matches.flatMap((match) => toProviderMatch(match) ?? []);
  }

  private async get(path: string): Promise<unknown> {
    await this.waitForQuota();

    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'X-Auth-Token': this.apiKey },
    });
    this.readQuota(response.headers);

    if (response.status === 429) {
      throw new Error(
        `football-data.org rate limit hit for ${path}; resets in ${this.secondsUntilReset()}s`,
      );
    }
    if (!response.ok) {
      throw new Error(`football-data.org ${response.status} for ${path}`);
    }
    return response.json();
  }

  // The provider asks clients to throttle using these headers rather than
  // retrying into its rate limiter. The API sends the "-minute" header; the
  // docs name it X-RequestsAvailable, so accept either.
  private readQuota(headers: Headers) {
    const left =
      headers.get('x-requests-available-minute') ??
      headers.get('x-requestsavailable');
    const resetSeconds = headers.get('x-requestcounter-reset');
    if (left !== null) this.requestsLeft = Number(left);
    if (resetSeconds !== null) {
      this.quotaResetsAt = Date.now() + Number(resetSeconds) * 1000;
    }
  }

  private async waitForQuota() {
    if (this.requestsLeft > 0) return;
    const waitMs = this.quotaResetsAt - Date.now();
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    this.requestsLeft = Infinity;
  }

  private secondsUntilReset() {
    return Math.max(0, Math.ceil((this.quotaResetsAt - Date.now()) / 1000));
  }
}

// Returns null for fixtures whose teams aren't known yet (e.g. a knockout
// round before the previous one is played): there's nothing to predict.
export function toProviderMatch(
  match: FootballDataMatch,
): ProviderMatch | null {
  const homeTeam = toTeam(match.homeTeam);
  const awayTeam = toTeam(match.awayTeam);
  if (!homeTeam || !awayTeam) return null;

  // Predictions are scored on the result after 90 minutes, so extra time
  // and penalties don't count. regularTime only exists for longer matches.
  const score = match.score.regularTime ?? match.score.fullTime;
  const status = STATUS[match.status];

  return {
    externalId: String(match.id),
    season: Number(match.season.startDate.slice(0, 4)),
    matchday: match.matchday,
    // Leagues have a single stage; only cups need it.
    stage: match.stage === 'REGULAR_SEASON' ? null : match.stage,
    homeTeam,
    awayTeam,
    kickoff: new Date(match.utcDate),
    status,
    homeScore: score.home,
    awayScore: score.away,
    winner:
      status === 'finished' && match.score.winner
        ? WINNER[match.score.winner]
        : null,
  };
}

function toTeam(team: FootballDataTeam): ProviderTeam | null {
  if (team.id === null || team.name === null) return null;
  return {
    externalId: String(team.id),
    name: team.name,
    shortName: team.shortName || null,
    tla: team.tla || null,
    crestUrl: team.crest || null,
  };
}
