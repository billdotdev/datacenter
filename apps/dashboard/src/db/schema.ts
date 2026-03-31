import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role", { enum: ["admin", "operator", "viewer"] }).default(
    "viewer"
  ),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const drillDefinition = pgTable(
  "drill_definition",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    requiresDisruptiveActions: boolean("requires_disruptive_actions")
      .default(true)
      .notNull(),
    targetType: text("target_type", { enum: ["workload", "node"] })
      .default("workload")
      .notNull(),
    targetNamespace: text("target_namespace").notNull(),
    targetSelector: jsonb("target_selector").notNull(),
    blastRadiusSummary: text("blast_radius_summary").notNull(),
    template: jsonb("template").default({}).notNull(),
    chaosTemplate: jsonb("chaos_template").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("drill_definition_key_idx").on(table.key)]
);

export const drillTarget = pgTable(
  "drill_target",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["workload", "node"] }).notNull(),
    namespace: text("namespace"),
    serviceName: text("service_name"),
    selector: jsonb("selector"),
    nodeName: text("node_name"),
    blastRadiusSummary: text("blast_radius_summary").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("drill_target_key_idx").on(table.key)]
);

export const drillRun = pgTable(
  "drill_run",
  {
    id: text("id").primaryKey(),
    drillDefinitionId: text("drill_definition_id")
      .notNull()
      .references(() => drillDefinition.id, { onDelete: "restrict" }),
    drillTargetId: text("drill_target_id")
      .notNull()
      .references(() => drillTarget.id, { onDelete: "restrict" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    drillKey: text("drill_key").notNull(),
    targetKey: text("target_key").notNull(),
    status: text("status").notNull(),
    targetSummary: text("target_summary").notNull(),
    chaosNamespace: text("chaos_namespace"),
    chaosName: text("chaos_name"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("drill_run_definition_idx").on(table.drillDefinitionId),
    index("drill_run_target_idx").on(table.drillTargetId),
    index("drill_run_requested_by_idx").on(table.requestedByUserId),
    index("drill_run_status_idx").on(table.status),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_event_type_idx").on(table.eventType),
    index("audit_log_actor_idx").on(table.actorUserId),
  ]
);

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  booleanValue: boolean("boolean_value").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  drillRuns: many(drillRun),
  auditLogs: many(auditLog),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const drillDefinitionRelations = relations(
  drillDefinition,
  ({ many }) => ({
    runs: many(drillRun),
  })
);

export const drillTargetRelations = relations(drillTarget, ({ many }) => ({
  runs: many(drillRun),
}));

export const drillRunRelations = relations(drillRun, ({ one }) => ({
  drillDefinition: one(drillDefinition, {
    fields: [drillRun.drillDefinitionId],
    references: [drillDefinition.id],
  }),
  drillTarget: one(drillTarget, {
    fields: [drillRun.drillTargetId],
    references: [drillTarget.id],
  }),
  requestedByUser: one(user, {
    fields: [drillRun.requestedByUserId],
    references: [user.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actorUser: one(user, {
    fields: [auditLog.actorUserId],
    references: [user.id],
  }),
}));
