CREATE TYPE "public"."data_provider" AS ENUM('football_data', 'openligadb');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'paused', 'finished', 'postponed', 'cancelled');--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "competitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"provider" "data_provider" NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "matches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"provider" "data_provider" NOT NULL,
	"external_id" text NOT NULL,
	"competition_id" integer NOT NULL,
	"season" integer NOT NULL,
	"matchday" integer,
	"stage" text,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"kickoff" timestamp with time zone NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"provider" "data_provider" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"tla" text,
	"crest_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitions_provider_external_id_index" ON "competitions" USING btree ("provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_provider_external_id_index" ON "matches" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "matches_competition_id_kickoff_index" ON "matches" USING btree ("competition_id","kickoff");--> statement-breakpoint
CREATE INDEX "matches_status_index" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_provider_external_id_index" ON "teams" USING btree ("provider","external_id");