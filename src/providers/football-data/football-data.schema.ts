import { z } from 'zod';

// Only the fields we use from football-data.org's v4 /matches response.

// Knockout fixtures can exist before the teams are known, so id and name
// may be null.
const team = z.object({
  id: z.number().nullable(),
  name: z.string().nullable(),
  shortName: z.string().nullish(),
  tla: z.string().nullish(),
  crest: z.string().nullish(),
});

const score = z.object({
  home: z.number().nullable(),
  away: z.number().nullable(),
});

export const footballDataStatus = z.enum([
  'SCHEDULED',
  'TIMED',
  'IN_PLAY',
  'PAUSED',
  'FINISHED',
  'AWARDED',
  'POSTPONED',
  'SUSPENDED',
  'CANCELLED',
]);

export const footballDataMatchSchema = z.object({
  id: z.number(),
  utcDate: z.iso.datetime(),
  status: footballDataStatus,
  matchday: z.number().nullable(),
  stage: z.string(),
  season: z.object({ startDate: z.iso.date() }),
  homeTeam: team,
  awayTeam: team,
  score: z.object({
    // Overall winner, including extra time and penalties.
    winner: z.enum(['HOME_TEAM', 'AWAY_TEAM', 'DRAW']).nullable(),
    fullTime: score,
    // Only present when a match went beyond 90 minutes.
    regularTime: score.nullish(),
  }),
});

export const footballDataMatchesResponseSchema = z.object({
  matches: z.array(footballDataMatchSchema),
});

export type FootballDataMatch = z.infer<typeof footballDataMatchSchema>;
export type FootballDataTeam = z.infer<typeof team>;
export type FootballDataStatus = z.infer<typeof footballDataStatus>;
