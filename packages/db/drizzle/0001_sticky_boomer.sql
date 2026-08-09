CREATE TYPE "public"."content_post_status" AS ENUM('draft', 'scheduled', 'published', 'failed');--> statement-breakpoint
CREATE TABLE "content_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"status" "content_post_status" DEFAULT 'draft' NOT NULL,
	"topic" text,
	"prompt" text,
	"body" text,
	"post_url" text,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trend_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"campaign_id" uuid,
	"keyword" text NOT NULL,
	"payload" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_jobs" ADD COLUMN "content_post_id" uuid;--> statement-breakpoint
ALTER TABLE "action_jobs" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "seat_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "linkedin_seats" ADD COLUMN "actions_used_outbound_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "linkedin_seats" ADD COLUMN "actions_used_content_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "linkedin_seats" ADD COLUMN "outbound_budget_percent" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_seat_id_linkedin_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."linkedin_seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_snapshots" ADD CONSTRAINT "trend_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_snapshots" ADD CONSTRAINT "trend_snapshots_seat_id_linkedin_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."linkedin_seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_snapshots" ADD CONSTRAINT "trend_snapshots_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_jobs" ADD CONSTRAINT "action_jobs_content_post_id_content_posts_id_fk" FOREIGN KEY ("content_post_id") REFERENCES "public"."content_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_jobs" ADD CONSTRAINT "action_jobs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_seat_id_linkedin_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."linkedin_seats"("id") ON DELETE no action ON UPDATE no action;