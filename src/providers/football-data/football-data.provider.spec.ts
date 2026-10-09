import { readFileSync } from 'node:fs';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import {
  footballDataMatchesResponseSchema,
  type FootballDataMatch,
} from './football-data.schema.js';
import {
  FootballDataOrgProvider,
  toProviderMatch,
} from './football-data.provider.js';

// Real football-data.org responses: [0] Arsenal 3-0 Coventry (PL, finished),
// [1] Arsenal v Leeds (PL, timed), [2] Lens v Sporting (CL league stage).
const raw: unknown = JSON.parse(
  readFileSync('test/fixtures/football-data/matches.json', 'utf8'),
);
const [finished, timed, championsLeague] =
  footballDataMatchesResponseSchema.parse(raw).matches;

const config = {
  get: () => 'test-key',
} as unknown as ConfigService<Env, true>;

describe('toProviderMatch', () => {
  it('maps a finished league match', () => {
    expect(toProviderMatch(finished)).toEqual({
      externalId: '560542',
      season: 2026,
      matchday: 1,
      stage: null, // REGULAR_SEASON is dropped
      homeTeam: {
        externalId: '57',
        name: 'Arsenal FC',
        shortName: 'Arsenal',
        tla: 'ARS',
        crestUrl: 'https://crests.football-data.org/57.png',
      },
      awayTeam: expect.objectContaining({ tla: 'COV' }),
      kickoff: new Date('2026-08-21T19:00:00Z'),
      status: 'finished',
      homeScore: 3,
      awayScore: 0,
      winner: 'home',
    });
  });

  it('maps TIMED to scheduled with no score', () => {
    const match = toProviderMatch(timed);

    expect(match?.status).toBe('scheduled');
    expect([match?.homeScore, match?.awayScore]).toEqual([null, null]);
  });

  it('keeps the stage for cup matches', () => {
    expect(toProviderMatch(championsLeague)?.stage).toBe('LEAGUE_STAGE');
  });

  it.each([
    ['IN_PLAY', 'live'],
    ['PAUSED', 'paused'],
    ['AWARDED', 'finished'],
    ['SUSPENDED', 'postponed'],
    ['CANCELLED', 'cancelled'],
  ] as const)('maps %s to %s', (status, expected) => {
    expect(toProviderMatch({ ...timed, status })?.status).toBe(expected);
  });

  it('scores on the 90-minute result but keeps the shoot-out winner', () => {
    const penalties: FootballDataMatch = {
      ...championsLeague,
      status: 'FINISHED',
      score: {
        winner: 'AWAY_TEAM',
        fullTime: { home: 6, away: 5 }, // includes the shoot-out
        regularTime: { home: 1, away: 1 },
      },
    };

    const match = toProviderMatch(penalties);

    expect([match?.homeScore, match?.awayScore]).toEqual([1, 1]);
    expect(match?.winner).toBe('away'); // won the shoot-out
  });

  it('has no winner until the match is finished', () => {
    const live: FootballDataMatch = {
      ...timed,
      status: 'IN_PLAY',
      score: { winner: 'HOME_TEAM', fullTime: { home: 1, away: 0 } },
    };

    expect(toProviderMatch(live)?.winner).toBeNull();
  });

  it('skips fixtures whose teams are not known yet', () => {
    const unknownTeam = { id: null, name: null, tla: null, crest: null };

    expect(toProviderMatch({ ...timed, awayTeam: unknownTeam })).toBeNull();
  });
});

describe('FootballDataOrgProvider', () => {
  const quotaHeaders = (left: number, resetSeconds: number) => ({
    'x-requests-available-minute': String(left),
    'x-requestcounter-reset': String(resetSeconds),
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends the API key and maps every match', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(raw, { headers: quotaHeaders(9, 60) }));
    vi.stubGlobal('fetch', fetchMock);

    const matches = await new FootballDataOrgProvider(config).getSeasonMatches(
      'PL',
      2026,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/PL/matches?season=2026',
      { headers: { 'X-Auth-Token': 'test-key' } },
    );
    expect(matches).toHaveLength(3);
  });

  it('waits for the quota to reset once it is used up', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json(raw, { headers: quotaHeaders(0, 30) })),
      );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new FootballDataOrgProvider(config);

    await provider.getSeasonMatches('PL', 2026); // quota now at 0
    const second = provider.getSeasonMatches('CL', 2026);
    await vi.advanceTimersByTimeAsync(29_000);
    expect(fetchMock).toHaveBeenCalledTimes(1); // still waiting

    await vi.advanceTimersByTimeAsync(1_000);
    await second;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('also understands the header name from the docs', async () => {
    vi.useFakeTimers();
    const headers = {
      'x-requestsavailable': '0',
      'x-requestcounter-reset': '30',
    };
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json(raw, { headers })),
      );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new FootballDataOrgProvider(config);

    await provider.getSeasonMatches('PL', 2026);
    const second = provider.getSeasonMatches('CL', 2026);
    await vi.advanceTimersByTimeAsync(29_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    await second;
  });

  it('fails with a clear error when rate limited', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: 'Too many requests' },
            { status: 429, headers: quotaHeaders(0, 42) },
          ),
        ),
    );

    await expect(
      new FootballDataOrgProvider(config).getSeasonMatches('PL', 2026),
    ).rejects.toThrow(/rate limit.*resets in 42s/);
  });
});
