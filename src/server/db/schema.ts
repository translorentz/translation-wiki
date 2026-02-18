import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// Users
// ============================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).notNull().default("reader"), // reader | editor | admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  translationVersions: many(translationVersions),
  sourceVersions: many(sourceVersions),
  endorsements: many(endorsements),
  discussionThreads: many(discussionThreads),
  discussionPosts: many(discussionPosts),
  accounts: many(accounts),
}));

// ============================================================
// Accounts (OAuth)
// ============================================================

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 50 }),
    scope: text("scope"),
    id_token: text("id_token"),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_idx").on(
      table.provider,
      table.providerAccountId
    ),
    index("accounts_user_id_idx").on(table.userId),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ============================================================
// Invitation Tokens
// ============================================================

export const invitationTokens = pgTable(
  "invitation_tokens",
  {
    id: serial("id").primaryKey(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id),
    usedByUserId: integer("used_by_user_id").references(() => users.id),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  }
);

export const invitationTokensRelations = relations(
  invitationTokens,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [invitationTokens.createdByUserId],
      references: [users.id],
      relationName: "createdInvitations",
    }),
    usedBy: one(users, {
      fields: [invitationTokens.usedByUserId],
      references: [users.id],
      relationName: "usedInvitation",
    }),
  })
);

// ============================================================
// Languages
// ============================================================

export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // grc, la, zh
  name: varchar("name", { length: 100 }).notNull(), // Koine Greek, Latin, Classical Chinese
  displayName: varchar("display_name", { length: 100 }).notNull(),
});

export const languagesRelations = relations(languages, ({ many }) => ({
  texts: many(texts),
}));

// ============================================================
// Authors
// ============================================================

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameOriginalScript: varchar("name_original_script", { length: 255 }),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  era: varchar("era", { length: 255 }),
  description: text("description"),
  descriptionZh: text("description_zh"),
});

export const authorsRelations = relations(authors, ({ many }) => ({
  texts: many(texts),
}));

// ============================================================
// Texts
// ============================================================

export const texts = pgTable(
  "texts",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    titleOriginalScript: varchar("title_original_script", { length: 500 }),
    slug: varchar("slug", { length: 500 }).notNull(),
    languageId: integer("language_id")
      .notNull()
      .references(() => languages.id),
    authorId: integer("author_id")
      .notNull()
      .references(() => authors.id),
    description: text("description"),
    descriptionZh: text("description_zh"),
    sourceUrl: text("source_url"),
    totalChapters: integer("total_chapters").notNull().default(0),
    compositionYear: integer("composition_year"),
    compositionYearDisplay: varchar("composition_year_display", { length: 100 }),
    compositionEra: varchar("composition_era", { length: 255 }),
    sortOrder: integer("sort_order"), // For canonical ordering within a collection (e.g., 24 Histories: 1-24)
    textType: varchar("text_type", { length: 20 }).notNull().default("literature"), // literature | poetry
    genre: varchar("genre", { length: 50 }).notNull().default("uncategorized"), // philosophy | theology | devotional | commentary | literature | poetry | history | science | ritual
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("texts_language_slug_idx").on(table.languageId, table.slug),
  ]
);

export const textsRelations = relations(texts, ({ one, many }) => ({
  language: one(languages, {
    fields: [texts.languageId],
    references: [languages.id],
  }),
  author: one(authors, {
    fields: [texts.authorId],
    references: [authors.id],
  }),
  chapters: many(chapters),
}));

// ============================================================
// Chapters
// ============================================================

export const chapters = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    textId: integer("text_id")
      .notNull()
      .references(() => texts.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }),
    sourceContent: jsonb("source_content"), // { paragraphs: [{ index, text }] }
    currentSourceVersionId: integer("current_source_version_id"), // Points to latest sourceVersion
    ordering: integer("ordering").notNull(),
  },
  (table) => [
    uniqueIndex("chapters_text_number_idx").on(
      table.textId,
      table.chapterNumber
    ),
    index("chapters_text_id_idx").on(table.textId),
  ]
);

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  text: one(texts, {
    fields: [chapters.textId],
    references: [texts.id],
  }),
  translations: many(translations),
  sourceVersions: many(sourceVersions),
  currentSourceVersion: one(sourceVersions, {
    fields: [chapters.currentSourceVersionId],
    references: [sourceVersions.id],
    relationName: "currentSourceVersion",
  }),
  discussionThreads: many(discussionThreads),
}));

// ============================================================
// Translations
// ============================================================

export const translations = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    targetLanguage: varchar("target_language", { length: 10 }).notNull().default("en"),
    currentVersionId: integer("current_version_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("translations_chapter_lang_idx").on(table.chapterId, table.targetLanguage),
  ]
);

export const translationsRelations = relations(
  translations,
  ({ one, many }) => ({
    chapter: one(chapters, {
      fields: [translations.chapterId],
      references: [chapters.id],
    }),
    versions: many(translationVersions),
    currentVersion: one(translationVersions, {
      fields: [translations.currentVersionId],
      references: [translationVersions.id],
      relationName: "currentVersion",
    }),
  })
);

// ============================================================
// Translation Versions
// ============================================================

export const translationVersions = pgTable(
  "translation_versions",
  {
    id: serial("id").primaryKey(),
    translationId: integer("translation_id")
      .notNull()
      .references(() => translations.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    content: jsonb("content").notNull(), // { paragraphs: [{ index, text }] }
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    editSummary: text("edit_summary"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    previousVersionId: integer("previous_version_id"),
  },
  (table) => [
    index("tv_translation_id_idx").on(table.translationId),
    index("tv_author_id_idx").on(table.authorId),
  ]
);

export const translationVersionsRelations = relations(
  translationVersions,
  ({ one, many }) => ({
    translation: one(translations, {
      fields: [translationVersions.translationId],
      references: [translations.id],
    }),
    author: one(users, {
      fields: [translationVersions.authorId],
      references: [users.id],
    }),
    endorsements: many(endorsements),
    previousVersion: one(translationVersions, {
      fields: [translationVersions.previousVersionId],
      references: [translationVersions.id],
      relationName: "versionChain",
    }),
  })
);

// ============================================================
// Source Versions
// ============================================================

export const sourceVersions = pgTable(
  "source_versions",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    content: jsonb("content").notNull(), // { paragraphs: [{ index, text: string | null }] }
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    editSummary: text("edit_summary"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    previousVersionId: integer("previous_version_id"),
  },
  (table) => [
    index("sv_chapter_id_idx").on(table.chapterId),
    index("sv_author_id_idx").on(table.authorId),
  ]
);

export const sourceVersionsRelations = relations(
  sourceVersions,
  ({ one }) => ({
    chapter: one(chapters, {
      fields: [sourceVersions.chapterId],
      references: [chapters.id],
    }),
    author: one(users, {
      fields: [sourceVersions.authorId],
      references: [users.id],
    }),
    previousVersion: one(sourceVersions, {
      fields: [sourceVersions.previousVersionId],
      references: [sourceVersions.id],
      relationName: "sourceVersionChain",
    }),
  })
);

// ============================================================
// Endorsements
// ============================================================

export const endorsements = pgTable(
  "endorsements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    translationVersionId: integer("translation_version_id")
      .notNull()
      .references(() => translationVersions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("endorsements_user_version_idx").on(
      table.userId,
      table.translationVersionId
    ),
    index("endorsements_version_id_idx").on(table.translationVersionId),
  ]
);

export const endorsementsRelations = relations(endorsements, ({ one }) => ({
  user: one(users, {
    fields: [endorsements.userId],
    references: [users.id],
  }),
  translationVersion: one(translationVersions, {
    fields: [endorsements.translationVersionId],
    references: [translationVersions.id],
  }),
}));

// ============================================================
// Discussion Threads
// ============================================================

export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    isPinned: boolean("is_pinned").notNull().default(false),
    isResolved: boolean("is_resolved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("discussion_threads_chapter_id_idx").on(table.chapterId),
  ]
);

export const discussionThreadsRelations = relations(
  discussionThreads,
  ({ one, many }) => ({
    chapter: one(chapters, {
      fields: [discussionThreads.chapterId],
      references: [chapters.id],
    }),
    author: one(users, {
      fields: [discussionThreads.authorId],
      references: [users.id],
    }),
    posts: many(discussionPosts),
  })
);

// ============================================================
// Discussion Posts
// ============================================================

export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("discussion_posts_thread_id_idx").on(table.threadId),
  ]
);

export const discussionPostsRelations = relations(
  discussionPosts,
  ({ one }) => ({
    thread: one(discussionThreads, {
      fields: [discussionPosts.threadId],
      references: [discussionThreads.id],
    }),
    author: one(users, {
      fields: [discussionPosts.authorId],
      references: [users.id],
    }),
  })
);
