import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Where a row's data comes from. Every synced table stores this plus the
// provider's own id, so the sync job can find existing rows and update them.
export const dataProvider = pgEnum('data_provider', [
  'football_data',
  'openligadb',
]);

// Our own statuses. Provider adapters map their values (e.g. IN_PLAY, TIMED)
// onto these, so the rest of the app only knows one set.
export const matchStatus = pgEnum('match_status', [
  'scheduled',
  'live',
  'paused',
  'finished',
  'postponed',
  'cancelled',
]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const competitions = pgTable(
  'competitions',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: text().notNull().unique(), // 'PL', 'CL', 'BL1'
    name: text().notNull(),
    provider: dataProvider().notNull(),
    externalId: text().notNull(),
    emblemUrl: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.provider, t.externalId)],
);

// One row per provider: a club that comes from two providers (e.g. Bayern in
// the CL and the Bundesliga) appears twice. Fine while we have no team pages.
export const teams = pgTable(
  'teams',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    provider: dataProvider().notNull(),
    externalId: text().notNull(),
    name: text().notNull(),
    shortName: text(),
    tla: text(), // three-letter code, e.g. 'MUN'
    crestUrl: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.provider, t.externalId)],
);

export const matches = pgTable(
  'matches',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    provider: dataProvider().notNull(),
    externalId: text().notNull(),
    competitionId: integer()
      .notNull()
      .references(() => competitions.id),
    season: integer().notNull(), // start year: 2026 means 2026/27
    matchday: integer(), // gameweek; null for knockout rounds
    stage: text(), // e.g. 'LEAGUE_STAGE', 'ROUND_OF_16'
    homeTeamId: integer()
      .notNull()
      .references(() => teams.id),
    awayTeamId: integer()
      .notNull()
      .references(() => teams.id),
    // An exact instant (stored as UTC), so the prediction lock is `now() >= kickoff`.
    kickoff: timestamp({ withTimezone: true }).notNull(),
    status: matchStatus().notNull().default('scheduled'),
    // Null until the match starts: no score is not the same as 0-0.
    homeScore: integer(),
    awayScore: integer(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.provider, t.externalId),
    index().on(t.competitionId, t.kickoff), // fixtures for a competition
    index().on(t.status), // which matches are live
  ],
);
