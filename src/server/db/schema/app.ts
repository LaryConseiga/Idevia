import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Convention :
 * - toute table privée porte `user_id` et est protégée par RLS (voir drizzle/0001_rls.sql) ;
 * - les colonnes suffixées `_enc` contiennent du texte chiffré AES-256-GCM (server/crypto.ts).
 */

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const userRef = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

// ---------------------------------------------------------------- Profil

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  country: text("country"), // ISO 3166-1 alpha-2
  city: text("city"),
  currency: text("currency"), // ISO 4217 (XOF, XAF, GNF…)
  preferredLanguage: text("preferred_language").notNull().default("fr"),
  experienceLevel: text("experience_level"), // first | some | experienced
  plan: text("plan").notNull().default("free"), // free | pro
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------- Diagnostic

export const diagnosticStatus = pgEnum("diagnostic_status", [
  "in_progress",
  "portrait_ready",
  "completed",
  "abandoned",
]);

export const diagnostics = pgTable(
  "diagnostics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Nul tant que le diagnostic est anonyme. */
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    /** SHA-256 de l'identifiant de session anonyme (le cookie n'est jamais stocké en clair). */
    anonSessionHash: text("anon_session_hash"),
    status: diagnosticStatus("status").notNull().default("in_progress"),
    stateEnc: text("state_enc").notNull(),
    portraitEnc: text("portrait_enc"),
    portraitValidatedAt: timestamp("portrait_validated_at", { withTimezone: true }),
    turnCount: smallint("turn_count").notNull().default(0),
    promptVersion: text("prompt_version").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Purge automatique des diagnostics anonymes non rattachés. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("diagnostics_user_id_idx").on(t.userId),
    index("diagnostics_anon_idx").on(t.anonSessionHash),
    index("diagnostics_expires_idx").on(t.expiresAt),
  ],
);

export const diagnosticTurns = pgTable(
  "diagnostic_turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diagnosticId: uuid("diagnostic_id")
      .notNull()
      .references(() => diagnostics.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    turn: smallint("turn").notNull(),
    questionEnc: text("question_enc").notNull(),
    answerEnc: text("answer_enc"),
    /** llm | fallback : permet de mesurer la qualité du moteur adaptatif. */
    source: text("source").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("diagnostic_turns_unique").on(t.diagnosticId, t.turn)],
);

/**
 * Projection pour Neon Realtime (qui ne gère pas encore la RLS) : statut et avancement du diagnostic actif,
 * rien de personnel. Tenue à jour par un trigger (drizzle/0003_diagnostic_progress_sync.sql) ;
 * le rôle applicatif n'y a aucun droit : seul Realtime la lit, via une requête scellée filtrée sur user_id.
 */
export const diagnosticProgress = pgTable("diagnostic_progress", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  diagnosticId: uuid("diagnostic_id").notNull(),
  status: diagnosticStatus("status").notNull(),
  turnCount: smallint("turn_count").notNull(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------- Idées

export const ideaStatus = pgEnum("idea_status", ["suggested", "saved", "selected", "dismissed"]);
export const ideaBatchStatus = pgEnum("idea_batch_status", ["running", "ready", "failed"]);

/** Une génération d'idées : plusieurs modèles proposent, un juge classe, on garde les 3 meilleures. */
export const ideaBatches = pgTable(
  "idea_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    diagnosticId: uuid("diagnostic_id").references(() => diagnostics.id, { onDelete: "set null" }),
    status: ideaBatchStatus("status").notNull().default("running"),
    errorCode: text("error_code"),
    /** Traçabilité de l'orchestration : modèles utilisés, nombre de candidates, durées. Aucune donnée personnelle. */
    pipeline: jsonb("pipeline"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("idea_batches_user_idx").on(t.userId, t.createdAt)],
);

export const businessIdeas = pgTable(
  "business_ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    diagnosticId: uuid("diagnostic_id").references(() => diagnostics.id, { onDelete: "set null" }),
    batchId: uuid("batch_id").references(() => ideaBatches.id, { onDelete: "cascade" }),
    /** 1 = la plus pertinente. */
    rank: smallint("rank").notNull().default(1),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    details: jsonb("details").notNull(),
    compatibilityScore: smallint("compatibility_score").notNull(),
    scoreBreakdown: jsonb("score_breakdown").notNull(),
    /** Raisons personnelles citant les réponses de l'utilisateur : chiffrées. */
    whyYouEnc: text("why_you_enc").notNull(),
    /** Fiche complète (offre, plan d'action, risques), personnalisée : chiffrée. */
    contentEnc: text("content_enc"),
    status: ideaStatus("status").notNull().default("suggested"),
    createdAt: createdAt(),
  },
  (t) => [index("business_ideas_user_id_idx").on(t.userId), index("business_ideas_batch_idx").on(t.batchId, t.rank)],
);

// ---------------------------------------------------------------- Projets

export const projectStatus = pgEnum("project_status", ["active", "archived"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    selectedIdeaId: uuid("selected_idea_id").references(() => businessIdeas.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    status: projectStatus("status").notNull().default("active"),
    countryOrMarket: text("country_or_market"),
    /** Mémoire de projet (faits confirmés, décisions, apprentissages) : chiffrée. */
    memoryEnc: text("memory_enc"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("projects_user_id_idx").on(t.userId)],
);

export const validations = pgTable(
  "validations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: userRef(),
    hypothesis: text("hypothesis").notNull(),
    testDescription: text("test_description"),
    successCriteria: text("success_criteria"),
    status: text("status").notNull().default("untested"), // untested | testing | confirmed | invalidated
    resultEnc: text("result_enc"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("validations_project_id_idx").on(t.projectId)],
);

export const businessPlans = pgTable(
  "business_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: userRef(),
    version: integer("version").notNull(),
    /** Sections ; chaque bloc porte son origine : user | sourced | hypothesis | ai. */
    content: jsonb("content").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("business_plans_version_unique").on(t.projectId, t.version)],
);

export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "done", "blocked"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high"]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: userRef(),
    title: text("title").notNull(),
    description: text("description"),
    expectedResult: text("expected_result"),
    priority: taskPriority("priority").notNull().default("medium"),
    status: taskStatus("status").notNull().default("todo"),
    dueDate: date("due_date"),
    estimatedMinutes: integer("estimated_minutes"),
    sortOrder: integer("sort_order").notNull().default(0),
    notesEnc: text("notes_enc"),
    blockedReason: text("blocked_reason"),
    resources: jsonb("resources"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_project_id_idx").on(t.projectId),
    index("tasks_user_status_idx").on(t.userId, t.status),
  ],
);

export const projectNotes = pgTable(
  "project_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: userRef(),
    contentEnc: text("content_enc").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("project_notes_project_id_idx").on(t.projectId)],
);

// ---------------------------------------------------------------- Assistant

export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: userRef(),
    title: text("title").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("assistant_conversations_project_id_idx").on(t.projectId)],
);

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => assistantConversations.id, { onDelete: "cascade" }),
    userId: userRef(),
    role: text("role").notNull(), // user | assistant
    contentEnc: text("content_enc").notNull(),
    tokens: integer("tokens"),
    createdAt: createdAt(),
  },
  (t) => [index("assistant_messages_conversation_id_idx").on(t.conversationId)],
);

// ---------------------------------------------------------------- Signaux de marché (Apify)

/** Cache partagé, non personnel : aucune donnée utilisateur, uniquement des agrégats publics. */
export const marketSignals = pgTable(
  "market_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cacheKey: text("cache_key").notNull().unique(),
    kind: text("kind").notNull(), // local_competition | ecommerce | trends | ads | reviews
    actor: text("actor").notNull(),
    query: text("query").notNull(),
    country: text("country"),
    city: text("city"),
    payload: jsonb("payload").notNull(),
    sourceUrl: text("source_url"),
    limits: text("limits"),
    costUsd: integer("cost_micro_usd"),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("market_signals_expires_idx").on(t.expiresAt)],
);

export const projectMarketSignals = pgTable(
  "project_market_signals",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    signalId: uuid("signal_id")
      .notNull()
      .references(() => marketSignals.id, { onDelete: "cascade" }),
    userId: userRef(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.signalId] })],
);

// ---------------------------------------------------------------- Catalogue API-mega-list

export const apiCatalog = pgTable(
  "api_catalog",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(), // auteur/actor
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    url: text("url").notNull(), // sans paramètre d'affiliation
    /** Collecte des données personnelles (emails, téléphones…) : jamais proposé ni appelé. */
    piiRisk: boolean("pii_risk").notNull().default(false),
    search: tsvector("search").generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))`,
    ),
  },
  (t) => [
    index("api_catalog_search_idx").using("gin", t.search),
    index("api_catalog_category_idx").on(t.category),
  ],
);

// ---------------------------------------------------------------- Usage, quotas, coûts

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    success: boolean("success").notNull(),
    errorCode: text("error_code"),
    latencyMs: integer("latency_ms"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_usage_created_idx").on(t.createdAt), index("ai_usage_feature_idx").on(t.feature)],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    userId: userRef(),
    period: text("period").notNull(), // YYYY-MM
    feature: text("feature").notNull(), // assistant_tokens | market_analysis | regeneration
    used: integer("used").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.period, t.feature] })],
);

export const proWaitlist = pgTable("pro_waitlist", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------- Analytics first-party

/**
 * Aucune donnée libre ni identifiant direct : `visitor_hash` est un hachage salé qui change chaque jour,
 * `user_id` n'est renseigné que pour les événements produit d'utilisateurs connectés.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    visitorHash: text("visitor_hash"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    path: text("path"),
    referrerHost: text("referrer_host"),
    utmSource: text("utm_source"),
    device: text("device"), // mobile | tablet | desktop
    browser: text("browser"),
    country: text("country"),
    properties: jsonb("properties"),
    createdAt: createdAt(),
  },
  (t) => [
    index("analytics_events_name_created_idx").on(t.name, t.createdAt),
    index("analytics_events_created_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------- Blog SEO

export const postStatus = pgEnum("post_status", ["draft", "scheduled", "published"]);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    excerpt: text("excerpt"),
    content: text("content").notNull(), // Markdown, rendu sanitisé
    category: text("category"),
    tags: text("tags").array(),
    coverImage: text("cover_image"),
    coverAlt: text("cover_alt"),
    status: postStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    revisedAt: timestamp("revised_at", { withTimezone: true }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("posts_status_published_idx").on(t.status, t.publishedAt)],
);

// ---------------------------------------------------------------- Administration et RGPD

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    adminUserId: text("admin_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("admin_audit_logs_created_idx").on(t.createdAt)],
);

export const deletionRequests = pgTable("deletion_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef().unique(),
  requestedAt: createdAt(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"), // pending | cancelled | done
});
