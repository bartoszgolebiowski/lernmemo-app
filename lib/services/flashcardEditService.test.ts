import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import path from "path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { DrizzleDatabase, createDatabaseSQLite } from "~/db/index";
import {
  flashcardAttachment,
  flashcardImport,
  flashcardTranslation,
} from "~/db/schema/flashcard";
import { FlashcardEditService, Translation } from "./flashcardEditService";
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

async function setupTestData(db: DrizzleDatabase) {
  const userId = uuidv4();
  const anotherUserId = uuidv4();

  // Create test attachments for both users
  const userAttachments = await db
    .insert(flashcardAttachment)
    .values([
      {
        userId,
        fileLocation: "test-flashcard-en-de.csv",
      },
      {
        userId,
        fileLocation: "test-flashcard-en-es.csv",
      },
    ])
    .returning();

  // Create an attachment for another user (for testing authorization)
  const otherUserAttachment = await db
    .insert(flashcardAttachment)
    .values({
      userId: anotherUserId,
      fileLocation: "other-user-attachment.csv",
    })
    .returning();

  // Define some translations for English to German
  const enDeTranslations: Translation[] = [
    { word: "house", translation: "Haus", targetLanguage: "de" },
    { word: "dog", translation: "Hund", targetLanguage: "de" },
    { word: "book", translation: "Buch", targetLanguage: "de" },
  ];

  // Define some translations for English to Spanish
  const enEsTranslations: Translation[] = [
    { word: "house", translation: "casa", targetLanguage: "es" },
    { word: "dog", translation: "perro", targetLanguage: "es" },
  ];

  // Create translations and link them to attachments
  for (const item of enDeTranslations) {
    const translations = await db
      .insert(flashcardTranslation)
      .values({
        word: item.word,
        translation: item.translation,
        targetLanguage: item.targetLanguage,
      })
      .returning();

    await db.insert(flashcardImport).values({
      attachmentId: userAttachments[0].attachmentId,
      translationId: translations[0].translationId,
    });
  }

  for (const item of enEsTranslations) {
    const translations = await db
      .insert(flashcardTranslation)
      .values({
        word: item.word,
        translation: item.translation,
        targetLanguage: item.targetLanguage,
      })
      .returning();

    await db.insert(flashcardImport).values({
      attachmentId: userAttachments[1].attachmentId,
      translationId: translations[0].translationId,
    });
  }

  // Create one translation for the other user
  const otherUserTranslation = await db
    .insert(flashcardTranslation)
    .values({
      word: "private",
      translation: "privat",
      targetLanguage: "de",
    })
    .returning();

  await db.insert(flashcardImport).values({
    attachmentId: otherUserAttachment[0].attachmentId,
    translationId: otherUserTranslation[0].translationId,
  });

  return {
    userId,
    anotherUserId,
    userAttachments: userAttachments.map((a) => a.attachmentId),
    otherUserAttachmentId: otherUserAttachment[0].attachmentId,
  };
}

describe("FlashcardEditService Integration Tests", () => {
  let db: DrizzleDatabase;
  let flashcardEditService: FlashcardEditService;
  let testData: {
    userId: string;
    anotherUserId: string;
    userAttachments: string[];
    otherUserAttachmentId: string;
  };

  beforeAll(async () => {
    db = await mockDatabaseAndMigration();
    flashcardEditService = new FlashcardEditService(db);
  });

  beforeEach(async () => {
    testData = await setupTestData(db);
  });

  afterEach(async () => {
    await reset(db, schema);
  });

  describe("fetchFlashcardDetails", () => {
    it("should return flashcard details for a valid attachment", async () => {
      // Arrange
      const { userId, userAttachments } = testData;
      const attachmentId = userAttachments[0]; // English to German attachment

      // Act
      const result = await flashcardEditService.fetchFlashcardDetails(
        attachmentId,
        userId
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.attachmentId).toBe(attachmentId);
      expect(result?.userId).toBe(userId);
      expect(result?.translations).toHaveLength(3);

      // Verify some translation details
      const translations = result?.translations || [];
      expect(translations.some((t) => t.word === "house" && t.translation === "Haus")).toBe(true);
      expect(translations.some((t) => t.word === "dog" && t.translation === "Hund")).toBe(true);
      expect(translations.some((t) => t.word === "book" && t.translation === "Buch")).toBe(true);
    });

    it("should return null when the attachment doesn't exist", async () => {
      // Arrange
      const { userId } = testData;
      const nonExistentAttachmentId = uuidv4();

      // Act
      const result = await flashcardEditService.fetchFlashcardDetails(
        nonExistentAttachmentId,
        userId
      );

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when the user doesn't own the attachment", async () => {
      // Arrange
      const { userId, otherUserAttachmentId } = testData;

      // Act - Try to access another user's attachment
      const result = await flashcardEditService.fetchFlashcardDetails(
        otherUserAttachmentId,
        userId
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateFlashcard", () => {
    it("should update existing translations", async () => {
      // Arrange
      const { userId, userAttachments } = testData;
      const attachmentId = userAttachments[0];

      // Get current translations to get their IDs
      const currentData = await flashcardEditService.fetchFlashcardDetails(
        attachmentId,
        userId
      );
      expect(currentData).not.toBeNull();

      const translations = currentData!.translations;
      const houseTranslation = translations.find((t) => t.word === "house");
      expect(houseTranslation).toBeDefined();

      // Update one translation
      const updatedTranslations = translations.map((t) => {
        if (t.word === "house") {
          return { ...t, translation: "das Haus" }; // Add the article
        }
        return t;
      });

      // Act
      const result = await flashcardEditService.updateFlashcard(
        attachmentId,
        { translations: updatedTranslations },
        userId
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.translations).toHaveLength(translations.length);

      // Verify the updated translation
      const updatedHouseTranslation = result?.translations.find(
        (t) => t.word === "house"
      );
      expect(updatedHouseTranslation).toBeDefined();
      expect(updatedHouseTranslation?.translation).toBe("das Haus");

      // Verify database was updated
      const dbTranslation = await db
        .select()
        .from(flashcardTranslation)
        .where(eq(flashcardTranslation.translationId, houseTranslation!.id!));
      expect(dbTranslation[0].translation).toBe("das Haus");
    });

    it("should add new translations", async () => {
      // Arrange
      const { userId, userAttachments } = testData;
      const attachmentId = userAttachments[0];

      // Get current translations
      const currentData = await flashcardEditService.fetchFlashcardDetails(
        attachmentId,
        userId
      );
      expect(currentData).not.toBeNull();

      const existingTranslations = currentData!.translations;
      
      // Add a new translation
      const updatedTranslations = [
        ...existingTranslations,
        {
          word: "water",
          translation: "Wasser",
          targetLanguage: "de"
        }
      ];

      // Act
      const result = await flashcardEditService.updateFlashcard(
        attachmentId,
        { translations: updatedTranslations },
        userId
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.translations).toHaveLength(existingTranslations.length + 1);

      // Verify the new translation
      const newTranslation = result?.translations.find(
        (t) => t.word === "water"
      );
      expect(newTranslation).toBeDefined();
      expect(newTranslation?.translation).toBe("Wasser");

      // Verify database has the new translation
      const importRecords = await db
        .select({
          translationData: flashcardTranslation,
        })
        .from(flashcardImport)
        .innerJoin(
          flashcardTranslation,
          eq(flashcardImport.translationId, flashcardTranslation.translationId)
        )
        .where(eq(flashcardImport.attachmentId, attachmentId));

      expect(importRecords.length).toBe(4); // 3 original + 1 new
      expect(
        importRecords.some(
          (r) => r.translationData.word === "water" && r.translationData.translation === "Wasser"
        )
      ).toBe(true);
    });

    it("should delete translations correctly", async () => {
      // Arrange
      const { userId, userAttachments } = testData;
      const attachmentId = userAttachments[0];

      // Get current translations
      const currentData = await flashcardEditService.fetchFlashcardDetails(
        attachmentId,
        userId
      );
      expect(currentData).not.toBeNull();

      const existingTranslations = currentData!.translations;
      
      // Mark one translation for deletion
      const updatedTranslations = existingTranslations.map((t) => {
        if (t.word === "book") {
          return { ...t, isDeleted: true };
        }
        return t;
      });

      // Act
      const result = await flashcardEditService.updateFlashcard(
        attachmentId,
        { translations: updatedTranslations },
        userId
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.translations).toHaveLength(existingTranslations.length - 1);

      // Verify the deleted translation is gone
      expect(result?.translations.some((t) => t.word === "book")).toBe(false);

      // Verify database no longer has the import record
      const importRecords = await db
        .select()
        .from(flashcardImport)
        .innerJoin(
          flashcardTranslation,
          eq(flashcardImport.translationId, flashcardTranslation.translationId)
        )
        .where(eq(flashcardImport.attachmentId, attachmentId));

      expect(importRecords.length).toBe(2); // 3 original - 1 deleted
    });

    it("should reject updates for attachments the user doesn't own", async () => {
      // Arrange
      const { userId, otherUserAttachmentId } = testData;

      // Act & Assert - Try to update another user's attachment
      await expect(
        flashcardEditService.updateFlashcard(
          otherUserAttachmentId,
          { translations: [{ word: "test", translation: "test", targetLanguage: "en" }] },
          userId
        )
      ).rejects.toThrow("Flashcard attachment not found or access denied");
    });

    it("should validate input data", async () => {
      // Arrange
      const { userId, userAttachments } = testData;
      const attachmentId = userAttachments[0];

      // Act - Try to update with invalid data (empty translations array)
      const result = await flashcardEditService.updateFlashcard(
        attachmentId,
        { translations: [] },
        userId
      );

      // Assert
      expect(result).toBeNull();
    });

    it("should reject translations with empty word or translation", async () => {
      // Arrange
      const { userId, userAttachments } = testData;
      const attachmentId = userAttachments[0];

      // Act - Try to update with invalid data (empty word)
      const result = await flashcardEditService.updateFlashcard(
        attachmentId,
        { 
          translations: [
            { word: "", translation: "test", targetLanguage: "en" }
          ] 
        },
        userId
      );

      // Assert
      expect(result).toBeNull();
    });
  });
});
