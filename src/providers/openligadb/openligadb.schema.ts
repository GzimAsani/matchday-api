import { z } from 'zod';

// Only the fields we use. Zod drops the rest, and fails loudly if one of
// these changes shape, instead of letting bad data reach the database.
const team = z.object({
  teamId: z.number(),
  teamName: z.string(),
  shortName: z.string().nullish(),
  teamIconUrl: z.string().nullish(),
});

const result = z.object({
  resultOrderID: z.number(),
  pointsTeam1: z.number(),
  pointsTeam2: z.number(),
});

const goal = z.object({
  scoreTeam1: z.number(),
  scoreTeam2: z.number(),
});

export const openLigaMatchSchema = z.object({
  matchID: z.number(),
  matchDateTimeUTC: z.iso.datetime(),
  leagueSeason: z.number(),
  group: z.object({ groupOrderID: z.number() }).nullish(),
  team1: team,
  team2: team,
  matchIsFinished: z.boolean(),
  matchResults: z.array(result).nullish(),
  goals: z.array(goal).nullish(),
});

export const openLigaMatchesSchema = z.array(openLigaMatchSchema);

export type OpenLigaMatch = z.infer<typeof openLigaMatchSchema>;
export type OpenLigaTeam = z.infer<typeof team>;
