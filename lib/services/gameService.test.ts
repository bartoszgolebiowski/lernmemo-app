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
  flashcardGameAttachment,
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
    .values([
      {
        userId,
        fileLocation: "test-attachment-de.csv",
      },
      {
        userId,
        fileLocation: "test-attachment-es.csv",
      },
    ])
    .returning();

  // Create some test translations
  const translations1 = [
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
  const translations2 = [
    { word: "apple", translation: "manzana" },
    { word: "house", translation: "casa" },
    { word: "car", translation: "coche" },
    { word: "book", translation: "libro" },
    { word: "dog", translation: "perro" },
    { word: "cat", translation: "gato" },
    { word: "tree", translation: "árbol" },
    { word: "flower", translation: "flor" },
    { word: "sun", translation: "sol" },
    { word: "moon", translation: "luna" },
    { word: "water", translation: "agua" },
    { word: "fire", translation: "fuego" },
    { word: "earth", translation: "tierra" },
    { word: "wind", translation: "viento" },
    { word: "cloud", translation: "nube" },
    { word: "rain", translation: "lluvia" },
    { word: "snow", translation: "nieve" },
    { word: "ice", translation: "hielo" },
    { word: "mountain", translation: "montaña" },
    { word: "lake", translation: "lago" },
  ];

  // Insert translations and link to attachment
  for (const item of translations1) {
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
      attachmentId: attachments[0].attachmentId,
      translationId: translation.translationId,
    });
  }

  // Insert translations and link to attachment
  for (const item of translations2) {
    const translations = await db
      .insert(flashcardTranslation)
      .values({
        word: item.word,
        translation: item.translation,
        targetLanguage: "es",
      })
      .returning();

    const translation = translations[0];

    await db.insert(flashcardImport).values({
      attachmentId: attachments[1].attachmentId,
      translationId: translation.translationId,
    });
  }

  return attachments.map((a) => a.attachmentId);
}

describe("GameService Integration Tests", () => {
  const userId = uuidv4();
  let db: DrizzleDatabase;
  let gameService: GameService;
  let attachments: string[];

  beforeAll(async () => {
    db = await mockDatabaseAndMigration();
    gameService = new GameService(db);
  });

  beforeEach(async () => {
    attachments = await setupTestTranslations(db, userId);
  });

  afterEach(async () => {
    await reset(db, schema);
  });

  describe("createGame", () => {
    it("should create a game with specified number of flashcards", async () => {
      // Arrange
      const flashcardCount = 3;
      const attachmentId = attachments[0];

      // Act
      const result = await gameService.createGame(
        [attachmentId], // Pass as array
        userId,
        flashcardCount
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
      expect(games[0].flashcards).toBe(flashcardCount);

      // Verify game-attachment link was created
      const gameAttachments = await db
        .select()
        .from(flashcardGameAttachment)
        .where(eq(flashcardGameAttachment.gameId, result.gameId));
      expect(gameAttachments.length).toBe(1);
      expect(gameAttachments[0].attachmentId).toBe(attachmentId);

      // Verify game translations were created
      const gameTranslations = await db
        .select()
        .from(flashcardGameTranslation)
        .where(eq(flashcardGameTranslation.gameId, result.gameId));
      expect(gameTranslations.length).toBe(flashcardCount);
    });

    it("should create a game with flashcards from multiple attachments", async () => {
      // Arrange
      const flashcardCount = 5;

      // Act
      const result = await gameService.createGame(
        attachments,
        userId,
        flashcardCount
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

      // Verify game-attachment links were created for all attachments
      const gameAttachments = await db
        .select()
        .from(flashcardGameAttachment)
        .where(eq(flashcardGameAttachment.gameId, result.gameId));
      expect(gameAttachments.length).toBe(attachments.length);

      // Verify game translations were created
      const gameTranslations = await db
        .select()
        .from(flashcardGameTranslation)
        .where(eq(flashcardGameTranslation.gameId, result.gameId));
      expect(gameTranslations.length).toBe(flashcardCount);
    });

    it("should create a game with all available flashcards when ALL_FLASHCARDS is specified", async () => {
      // Arrange
      const totalFlashcardsInAttachments = 40; // 20 from each attachment

      // Act
      const result = await gameService.createGame(
        attachments,
        userId,
        GameService.ALL_FLASHCARDS
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
      expect(games[0].flashcards).toBe(totalFlashcardsInAttachments);

      // Verify game-attachment links were created for all attachments
      const gameAttachments = await db
        .select()
        .from(flashcardGameAttachment)
        .where(eq(flashcardGameAttachment.gameId, result.gameId));
      expect(gameAttachments.length).toBe(attachments.length);

      // Verify game translations were created for all available flashcards
      const gameTranslations = await db
        .select()
        .from(flashcardGameTranslation)
        .where(eq(flashcardGameTranslation.gameId, result.gameId));
      expect(gameTranslations.length).toBe(totalFlashcardsInAttachments);
    });

    it("should throw an error when attachment does not exist", async () => {
      // Arrange
      const nonExistentAttachmentId = uuidv4();

      // Act & Assert
      await expect(
        gameService.createGame([nonExistentAttachmentId], userId, 3)
      ).rejects.toThrow("Failed to create game");
    });

    it("should throw an error when no attachments are provided", async () => {
      // Act & Assert
      await expect(gameService.createGame([], userId, 3)).rejects.toThrow(
        "At least one attachment ID is required"
      );
    });

    it("should exclude deactivated flashcards when creating a game", async () => {
      // Arrange - Deactivate a few translations
      const translations = await db
        .select()
        .from(flashcardTranslation)
        .where(eq(flashcardTranslation.targetLanguage, "de"))
        .limit(5);
      
      // Deactivate first 3 translations
      for (let i = 0; i < 3; i++) {
        await db
          .update(flashcardTranslation)
          .set({ deactivatedAt: new Date().toISOString() })
          .where(eq(flashcardTranslation.translationId, translations[i].translationId));
      }

      // Act - Create game with all flashcards
      const result = await gameService.createGame(
        [attachments[0]],
        userId,
        GameService.ALL_FLASHCARDS
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.gameId).toBeDefined();

      // Verify game has only active flashcards (17 instead of 20)
      const games = await db
        .select()
        .from(flashcardGame)
        .where(eq(flashcardGame.gameId, result.gameId));
      expect(games.length).toBe(1);
      expect(games[0].flashcards).toBe(17); // 20 original - 3 deactivated

      // Verify game translations only include active flashcards
      const gameTranslations = await db
        .select()
        .from(flashcardGameTranslation)
        .innerJoin(
          flashcardTranslation,
          eq(flashcardGameTranslation.translationId, flashcardTranslation.translationId)
        )
        .where(eq(flashcardGameTranslation.gameId, result.gameId));
      
      expect(gameTranslations.length).toBe(17);
      
      // Verify none of the deactivated translations are included
      for (let i = 0; i < 3; i++) {
        const deactivatedId = translations[i].translationId;
        const included = gameTranslations.some(t => 
          t?.flashcard_game_translation.translationId === deactivatedId
        );
        expect(included).toBe(false);
      }
    });

    it("should create a game with specific number of flashcards excluding deactivated ones", async () => {
      // Arrange - Deactivate a couple of translations
      const translations = await db
        .select()
        .from(flashcardTranslation)
        .where(eq(flashcardTranslation.targetLanguage, "de"))
        .limit(4);
      
      // Deactivate first 2 translations
      for (let i = 0; i < 2; i++) {
        await db
          .update(flashcardTranslation)
          .set({ deactivatedAt: new Date().toISOString() })
          .where(eq(flashcardTranslation.translationId, translations[i].translationId));
      }

      // Act - Request 5 flashcards
      const flashcardCount = 5;
      const result = await gameService.createGame(
        [attachments[0]],
        userId,
        flashcardCount
      );

      // Assert
      expect(result).toBeDefined();
      
      // Verify game has the requested number of flashcards
      const gameTranslations = await db
        .select({
          translationId: flashcardGameTranslation.translationId,
          deactivatedAt: flashcardTranslation.deactivatedAt
        })
        .from(flashcardGameTranslation)
        .innerJoin(
          flashcardTranslation,
          eq(flashcardGameTranslation.translationId, flashcardTranslation.translationId)
        )
        .where(eq(flashcardGameTranslation.gameId, result.gameId));
      
      expect(gameTranslations.length).toBe(flashcardCount);
      
      // Verify none of the flashcards are deactivated
      const hasDeactivated = gameTranslations.some(t => t.deactivatedAt !== null);
      expect(hasDeactivated).toBe(false);
    });

    it("should handle when all flashcards are deactivated", async () => {
      // Arrange - Deactivate all translations for one attachment
      const translations = await db
        .select()
        .from(flashcardTranslation)
        .where(eq(flashcardTranslation.targetLanguage, "de"));
      
      // Deactivate all translations
      for (const translation of translations) {
        await db
          .update(flashcardTranslation)
          .set({ deactivatedAt: new Date().toISOString() })
          .where(eq(flashcardTranslation.translationId, translation.translationId));
      }

      // Act & Assert - Should still create game with 0 flashcards from attachment[0]
      // but include translations from attachment[1]
      const result = await gameService.createGame(
        attachments,
        userId,
        GameService.ALL_FLASHCARDS
      );

      expect(result).toBeDefined();
      
      // Verify game has correct number of flashcards (only from the second attachment)
      const gameTranslations = await db
        .select()
        .from(flashcardGameTranslation)
        .where(eq(flashcardGameTranslation.gameId, result.gameId));
      
      expect(gameTranslations.length).toBe(20); // Only the 20 Spanish translations
    });

    it("should throw error when all flashcards from all attachments are deactivated", async () => {
      // Arrange - Deactivate all translations
      const allTranslations = await db
        .select()
        .from(flashcardTranslation);
      
      // Deactivate all translations
      for (const translation of allTranslations) {
        await db
          .update(flashcardTranslation)
          .set({ deactivatedAt: new Date().toISOString() })
          .where(eq(flashcardTranslation.translationId, translation.translationId));
      }

      // Act & Assert
      await expect(
        gameService.createGame(attachments, userId, 5)
      ).rejects.toThrow("No active flashcards found for the provided attachments");
    });
  });

  describe("submitAnswer", () => {
    it("should record a submitted answer", async () => {
      // Arrange - First create a game
      const { gameId } = await gameService.createGame(
        [attachments[0]], // Pass as array
        userId,
        3
      );

      // Get a translation ID from the game
      const gameTranslation = await db
        .select()
        .from(flashcardGameTranslation)
        .where(eq(flashcardGameTranslation.gameId, gameId))
        .limit(1);
      expect(gameTranslation.length).toBe(1);

      const translationId = gameTranslation[0].translationId;
      const selectedTranslationId = translationId;

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
        [attachments[0]], // Pass as array
        userId,
        3
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
