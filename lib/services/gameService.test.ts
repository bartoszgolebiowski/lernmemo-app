import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import path from "path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { DrizzleDatabase, createDatabaseSQLite } from "~/db/index";
import {
  flashcardAttachment,
  flashcardGame,
  flashcardGameAnswer,
  flashcardGameTranslation,
  flashcardImport,
  flashcardTranslation,
} from "~/db/schema/flashcard";
import { GameService } from "./gameService";
import { eq } from "drizzle-orm";
import { reset } from "drizzle-seed";
import * as schema from "~/db/schema";
import { v4 as uuidv4 } from "uuid";

async function mockDatabaseAndMigration() {
  // Set up test database and apply migrations before tests
  const db = createDatabaseSQLite(`file::memory:?cache=shared`);

  // Apply migrations to set up schema
  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, "../../db/migrations"),
    });
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Migration error: ", error);
    process.exit(1);
  }

  return db;
}

async function setupTestTranslations(db: DrizzleDatabase, userId: string) {
  // Create a test attachment
  const attachments = await db
    .insert(flashcardAttachment)
    .values({
      userId,
      fileLocation: "test-attachment.csv",
    })
    .returning();

  const attachment = attachments[0];

  // Create some test translations
  const translations = [
    { word: "apple", translation: "Apfel" },
    { word: "house", translation: "Haus" },
    { word: "car", translation: "Auto" },
    { word: "book", translation: "Buch" },
    { word: "dog", translation: "Hund" },
    { word: "cat", translation: "Katze" },
    { word: "tree", translation: "Baum" },
    { word: "flower", translation: "Blume" },
    { word: "sun", translation: "Sonne" },
    { word: "moon", translation: "Mond" },
    { word: "water", translation: "Wasser" },
    { word: "fire", translation: "Feuer" },
    { word: "earth", translation: "Erde" },
    { word: "wind", translation: "Wind" },
    { word: "cloud", translation: "Wolke" },
    { word: "rain", translation: "Regen" },
    { word: "snow", translation: "Schnee" },
    { word: "ice", translation: "Eis" },
    { word: "mountain", translation: "Berg" },
    { word: "lake", translation: "See" },
  ];

  // Insert translations and link to attachment
  for (const item of translations) {
    const translations = await db
      .insert(flashcardTranslation)
      .values({
        word: item.word,
        translation: item.translation,
        targetLanguage: "de",
      })
      .returning();

    const translation = translations[0];

    await db.insert(flashcardImport).values({
      attachmentId: attachment.attachmentId,
      translationId: translation.translationId,
    });
  }

  return attachment.attachmentId;
}

describe("GameService Integration Tests", () => {
  const userId = uuidv4();
  let db: DrizzleDatabase;
  let gameService: GameService;
  let attachmentId: string;

  beforeAll(async () => {
    db = await mockDatabaseAndMigration();
    gameService = new GameService(db);
  });

  beforeEach(async () => {
    attachmentId = await setupTestTranslations(db, userId);
  });

  afterEach(async () => {
    await reset(db, schema);
  });

  describe("createGame", () => {
    it("should create a game with specified number of flashcards", async () => {
      // Arrange
      const flashcardCount = 3;
      const questionCount = 10;

      // Act
      const result = await gameService.createGame(
        attachmentId,
        userId,
        flashcardCount,
        questionCount
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.gameId).toBeDefined();

      // Verify game record was created
      const games = await db
        .select()
        .from(flashcardGame)
        .where(eq(flashcardGame.gameId, result.gameId));
      expect(games.length).toBe(1);
      expect(games[0].userId).toBe(userId);
      expect(games[0].attachmentId).toBe(attachmentId);
      expect(games[0].flashcards).toBe(flashcardCount);
      expect(games[0].questions).toBe(questionCount);

      // Verify game translations were created
      const gameTranslations = await db
        .select()
        .from(flashcardGameTranslation)
        .where(eq(flashcardGameTranslation.gameId, result.gameId));
      expect(gameTranslations.length).toBe(flashcardCount);
    });

    it("should throw an error when attachment does not exist", async () => {
      // Arrange
      const nonExistentAttachmentId = uuidv4();

      // Act & Assert
      await expect(
        gameService.createGame(nonExistentAttachmentId, userId, 3, 10)
      ).rejects.toThrow("Failed to create game");
    });
  });

  describe("submitAnswer", () => {
    it("should record a submitted answer", async () => {
      // Arrange - First create a game
      const { gameId } = await gameService.createGame(
        attachmentId,
        userId,
        3,
        10
      );

      // Get a translation ID from the game
      const gameTranslation = await db
        .select()
        .from(flashcardGameTranslation)
        .where(eq(flashcardGameTranslation.gameId, gameId))
        .limit(1);
      expect(gameTranslation.length).toBe(1);

      const translationId = gameTranslation[0].translationId;
      const selectedTranslationId = gameTranslation[0].translationId;

      // Act
      const result = await gameService.submitAnswers(gameId, [
        { translationId, selectedTranslationId },
      ]);

      // Assert
      expect(result).toBeDefined();
      expect(result[0].answerId).toBeDefined();

      // Verify answer was recorded
      const answers = await db
        .select()
        .from(flashcardGameAnswer)
        .where(eq(flashcardGameAnswer.answerId, result[0].answerId));
      expect(answers.length).toBe(1);
      expect(answers[0].gameId).toBe(gameId);
      expect(answers[0].translationId).toBe(translationId);
      expect(answers[0].selectedTranslationId).toBe(selectedTranslationId);
    });
  });

  describe("completeGame", () => {
    it("should mark a game as completed", async () => {
      // Arrange - First create a game
      const { gameId } = await gameService.createGame(
        attachmentId,
        userId,
        3,
        10
      );

      // Act
      const result = await gameService.completeGame(gameId);

      // Assert
      expect(result).toBeDefined();
      expect(result.game).toBeDefined();
      expect(result.game.gameId).toBe(gameId);
      expect(result.game.completedAt).toBeDefined();

      // Verify the game was updated in the database
      const games = await db
        .select()
        .from(flashcardGame)
        .where(eq(flashcardGame.gameId, gameId));

      expect(games.length).toBe(1);
      expect(games[0].completedAt).toBeDefined();
    });

    it("should throw an error when game does not exist", async () => {
      // Arrange
      const nonExistentGameId = uuidv4();

      // Act & Assert
      await expect(gameService.completeGame(nonExistentGameId)).rejects.toThrow(
        "Game not found or could not be completed"
      );
    });
  });
});
