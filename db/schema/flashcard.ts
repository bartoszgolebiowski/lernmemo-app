import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";
import { user } from "./better-auth";

export const flashcardAttachment = sqliteTable("flashcard_attachment", {
  attachmentId: text("attachment_id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  fileLocation: text("file_location").notNull(),
  importedAt: text("imported_at").$default(() => new Date().toISOString()),
});

export const flashcardTranslation = sqliteTable("flashcard_translation", {
  translationId: text("translation_id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  word: text("word").notNull(),
  translation: text("translation").notNull(),
  targetLanguage: text("target_language").notNull(),
});

export const flashcardImport = sqliteTable(
  "flashcard_import",
  {
    attachmentId: text("attachment_id").references(
      () => flashcardAttachment.attachmentId
    ),
    translationId: text("translation_id").references(
      () => flashcardTranslation.translationId
    ),
  },
  (table) => [
    primaryKey({ columns: [table.attachmentId, table.translationId] }),
  ]
);

export const flashcardGame = sqliteTable("flashcard_game", {
  gameId: text("game_id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  startAt: text("start_at").$default(() => new Date().toISOString()),
  completedAt: text("completed_at"),
  attachmentId: text("attachment_id")
    .notNull()
    .references(() => flashcardAttachment.attachmentId),
  flashcards: integer("cards").notNull(),
  questions: integer("questions").notNull(),
});

// New table: Collect all translations for specific game with a composite primary key.
export const flashcardGameTranslation = sqliteTable(
  "flashcard_game_translation",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => flashcardGame.gameId),
    translationId: text("translation_id")
      .notNull()
      .references(() => flashcardTranslation.translationId),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.translationId] })]
);

// New table: Collect answers for specific game for specific translation.
export const flashcardGameAnswer = sqliteTable("flashcard_game_answer", {
  answerId: text("answer_id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  gameId: text("game_id")
    .notNull()
    .references(() => flashcardGame.gameId),
  translationId: text("translation_id")
    .notNull()
    .references(() => flashcardTranslation.translationId),
  selectedTranslationId: text("selected_translation_id")
    .notNull()
    .references(() => flashcardTranslation.translationId),
});
