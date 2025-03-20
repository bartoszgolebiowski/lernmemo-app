import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";

export const flashcardAttachment = sqliteTable("flashcard_attachment", {
  attachmentId: text("attachment_id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  userId: text("user_id")
    .notNull(),
  fileLocation: text("file_location").notNull(),
  importedAt: text("imported_at").$default(() => new Date().toISOString()),
  deactivatedAt: text("deactivated_at"),
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
    .notNull(),
  createdAt: text("created_at").$default(() => new Date().toISOString()),
  completedAt: text("completed_at"),
  flashcards: integer("cards").notNull(),
});

export const flashcardGameAttachment = sqliteTable(
  "flashcard_game_attachment",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => flashcardGame.gameId),
    attachmentId: text("attachment_id")
      .notNull()
      .references(() => flashcardAttachment.attachmentId),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.attachmentId] })]
);

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
