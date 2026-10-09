import { readFileSync } from 'node:fs';
import {
  openLigaMatchesSchema,
  type OpenLigaMatch,
} from './openligadb.schema.js';
import { OpenLigaDbProvider, toProviderMatch } from './openligadb.provider.js';

// Real OpenLigaDB responses: [0] Bayern 5-1 Stuttgart (finished),
// [1] Dortmund v Bremen (not played yet, kickoff 2026-10-09T18:30:00Z).
const raw: unknown = JSON.parse(
  readFileSync('test/fixtures/openligadb/matches.json', 'utf8'),
);
const [finished, upcoming] = openLigaMatchesSchema.parse(raw);

const beforeKickoff = new Date('2026-10-09T12:00:00Z');
const duringMatch = new Date('2026-10-09T19:00:00Z');

describe('toProviderMatch', () => {
  it('maps a finished match with its final score', () => {
    const match = toProviderMatch(finished, beforeKickoff);

    expect(match).toEqual({
      externalId: '83156',
      season: 2026,
      matchday: 1,
      stage: null,
      homeTeam: expect.objectContaining({
        externalId: '40',
        name: 'FC Bayern München',
        tla: null,
      }),
      awayTeam: expect.objectContaining({ name: 'VfB Stuttgart' }),
      kickoff: new Date('2026-08-28T18:30:00Z'),
      status: 'finished',
      homeScore: 5, // full time, not the 1-0 at half time
      awayScore: 1,
      winner: 'home',
    });
  });

  it('has no score before kickoff', () => {
    const match = toProviderMatch(upcoming, beforeKickoff);

    expect(match.status).toBe('scheduled');
    expect(match.homeScore).toBeNull();
    expect(match.awayScore).toBeNull();
    expect(match.winner).toBeNull();
  });

  it('is live at 0-0 once kickoff has passed and nobody has scored', () => {
    const match = toProviderMatch(upcoming, duringMatch);

    expect(match.status).toBe('live');
    expect([match.homeScore, match.awayScore]).toEqual([0, 0]);
    expect(match.winner).toBeNull(); // not decided until full time
  });

  it('takes a live score from the latest goal', () => {
    const live: OpenLigaMatch = {
      ...upcoming,
      goals: [
        { scoreTeam1: 1, scoreTeam2: 0 },
        { scoreTeam1: 1, scoreTeam2: 1 },
      ],
    };

    const match = toProviderMatch(live, duringMatch);

    expect([match.homeScore, match.awayScore]).toEqual([1, 1]);
  });
});

describe('OpenLigaDbProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches a season and maps every match', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(raw));
    vi.stubGlobal('fetch', fetchMock);

    const matches = await new OpenLigaDbProvider().getSeasonMatches(
      'bl1',
      2026,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openligadb.de/getmatchdata/bl1/2026',
    );
    expect(matches).toHaveLength(2);
  });

  it('fails loudly when the response changes shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json([{ matchID: 'oops' }])),
    );

    await expect(
      new OpenLigaDbProvider().getSeasonMatches('bl1', 2026),
    ).rejects.toThrow();
  });
});
