import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const seatStatusEnum = pgEnum("seat_status", [
  "healthy",
  "needs_2fa",
  "restricted",
  "paused",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "completed",
  "stopped",
  "paused",
]);

export const campaignTypeEnum = pgEnum("campaign_type", ["outbound", "content"]);

export const browserEngineEnum = pgEnum("browser_engine", [
  "patchright",
  "cloakbrowser",
  "fake",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const proxies = pgTable("proxies", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  label: text("label").notNull(),
  serverUrl: text("server_url").notNull(),
  geo: text("geo"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const linkedinSeats = pgTable("linkedin_seats", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  label: text("label").notNull(),
  linkedinEmail: text("linkedin_email").notNull(),
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  proxyId: uuid("proxy_id")
    .notNull()
    .references(() => proxies.id),
  timezone: text("timezone").notNull().default("UTC"),
  status: seatStatusEnum("status").notNull().default("paused"),
  browserEngine: browserEngineEnum("browser_engine")
    .notNull()
    .default("fake"),
  killSwitch: boolean("kill_switch").notNull().default(false),
  dailyCapMin: integer("daily_cap_min").notNull().default(10),
  dailyCapMax: integer("daily_cap_max").notNull().default(20),
  actionsUsedToday: integer("actions_used_today").notNull().default(0),
  dailyCapPicked: integer("daily_cap_picked").notNull().default(15),
  capDay: text("cap_day"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  linkedinUrl: text("linkedin_url").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title"),
  company: text("company"),
  domain: text("domain"),
  email: text("email"),
  enrichmentStatus: text("enrichment_status").notNull().default("none"),
  customFields: jsonb("custom_fields").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const lists = pgTable("lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const listLeads = pgTable("list_leads", {
  listId: uuid("list_id")
    .notNull()
    .references(() => lists.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  type: campaignTypeEnum("type").notNull().default("outbound"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sequences = pgTable("sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  name: text("name").notNull(),
  seatId: uuid("seat_id")
    .notNull()
    .references(() => linkedinSeats.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sequenceSteps = pgTable("sequence_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequenceId: uuid("sequence_id")
    .notNull()
    .references(() => sequences.id),
  idx: integer("idx").notNull(),
  type: text("type").notNull(),
  config: jsonb("config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequenceId: uuid("sequence_id")
    .notNull()
    .references(() => sequences.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  stepIndex: integer("step_index").notNull().default(0),
  status: enrollmentStatusEnum("status").notNull().default("active"),
  connected: boolean("connected").notNull().default(false),
  replied: boolean("replied").notNull().default(false),
  lastStepCompletedAt: timestamp("last_step_completed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const actionJobs = pgTable("action_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  seatId: uuid("seat_id")
    .notNull()
    .references(() => linkedinSeats.id),
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id),
  leadId: uuid("lead_id").references(() => leads.id),
  stepType: text("step_type").notNull(),
  status: jobStatusEnum("status").notNull().default("queued"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  detail: text("detail"),
  prompt: text("prompt"),
  aiOutput: text("ai_output"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  seatId: uuid("seat_id").references(() => linkedinSeats.id),
  actionJobId: uuid("action_job_id").references(() => actionJobs.id),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
