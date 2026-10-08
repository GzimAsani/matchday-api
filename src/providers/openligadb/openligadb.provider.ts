import { Injectable } from '@nestjs/common';
import type {
  FootballDataProvider,
  MatchStatus,
  ProviderMatch,
  ProviderTeam,
} from '../provider.types.js';
import {
  openLigaMatchesSchema,
  type OpenLigaMatch,
  type OpenLigaTeam,
} from './openligadb.schema.js';

const BASE_URL = 'https://api.openligadb.de';

// Bundesliga data. Free and keyless.
@Injectable()
export class OpenLigaDbProvider implements FootballDataProvider {
  readonly name = 'openligadb' as const;

  // competitionExternalId is the league shortcut, e.g. 'bl1'.
  async getSeasonMatches(
    competitionExternalId: string,
    season: number,
  ): Promise<ProviderMatch[]> {
    const url = `${BASE_URL}/getmatchdata/${competitionExternalId}/${season}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenLigaDB ${response.status} for ${url}`);
    }
    const matches = openLigaMatchesSchema.parse(await response.json());
    const now = new Date();
    return matches.map((match) => toProviderMatch(match, now));
  }
}

// Pure function: `now` is a parameter so tests can pick the moment.
export function toProviderMatch(
  match: OpenLigaMatch,
  now: Date,
): ProviderMatch {
  const kickoff = new Date(match.matchDateTimeUTC);
  const status = toStatus(match, kickoff, now);
  const score = status === 'scheduled' ? null : currentScore(match);

  return {
    externalId: String(match.matchID),
    season: match.leagueSeason,
    matchday: match.group?.groupOrderID ?? null,
    stage: null,
    homeTeam: toTeam(match.team1),
    awayTeam: toTeam(match.team2),
    kickoff,
    status,
    homeScore: score?.home ?? null,
    awayScore: score?.away ?? null,
  };
}

// OpenLigaDB only says whether a match is finished, so "live" is inferred
// from the kickoff time. It can't tell us about paused or postponed matches.
function toStatus(match: OpenLigaMatch, kickoff: Date, now: Date): MatchStatus {
  if (match.matchIsFinished) return 'finished';
  if (now >= kickoff) return 'live';
  return 'scheduled';
}

// The latest official result (e.g. full time after half time) if there is
// one, otherwise the score after the latest goal, otherwise 0-0.
function currentScore(match: OpenLigaMatch): { home: number; away: number } {
  const results = match.matchResults ?? [];
  if (results.length > 0) {
    const latest = results.reduce((a, b) =>
      b.resultOrderID > a.resultOrderID ? b : a,
    );
    return { home: latest.pointsTeam1, away: latest.pointsTeam2 };
  }
  const lastGoal = (match.goals ?? []).at(-1);
  if (lastGoal) return { home: lastGoal.scoreTeam1, away: lastGoal.scoreTeam2 };
  return { home: 0, away: 0 };
}

function toTeam(team: OpenLigaTeam): ProviderTeam {
  return {
    externalId: String(team.teamId),
    name: team.teamName,
    shortName: team.shortName || null,
    tla: null, // OpenLigaDB has no three-letter codes
    crestUrl: team.teamIconUrl || null,
  };
}
