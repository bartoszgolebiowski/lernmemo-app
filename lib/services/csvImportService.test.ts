import { afterEach, beforeAll, describe, expect, it } from "vitest";
import path from "path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { DrizzleDatabase, createDatabaseSQLite } from "~/db/index";
import {
  flashcardAttachment,
  flashcardImport,
  flashcardTranslation,
} from "~/db/schema/flashcard";
import { CsvImportService } from "./csvImportService";
import { eq } from "drizzle-orm";
import { reset } from "drizzle-seed";
import * as schema from "~/db/schema";
import { v4 as uuidv4 } from "uuid";

async function mockDatabaseAndMigration() {
  // Set up test database and apply migrations before tests
  const db = createDatabaseSQLite(`file::memory:?cache=shared`);

  // Apply migrations to set up schema
  try {
    // Apply migrations from the specified migrations folder.
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

describe("CsvImportService Integration Tests", () => {
  let db: DrizzleDatabase;
  let service: CsvImportService;
  const userId = uuidv4();
  const targetLanguage = "de";

  beforeAll(async () => {
    db = await mockDatabaseAndMigration();
    service = new CsvImportService(db);
  });

  afterEach(async () => {
    await reset(db, schema);
  });

  describe("importTranslationsFromCsv", () => {
    it("should successfully import valid CSV data", async () => {
      // Arrange
      const filePath = "test-import.csv";
      const csvContent = "word,translation\napple,Apfel\nhouse,Haus";

      // Act
      const result = await service.importTranslationsFromCsv(
        csvContent,
        filePath,
        userId,
        targetLanguage
      );

      // Assert
      expect(result.meta.total).toBe(2);
      expect(result.meta.success).toBe(2);
      expect(result.meta.failed).toBe(0);

      // Verify database records
      const attachments = await db
        .select()
        .from(flashcardAttachment)
        .where(eq(flashcardAttachment.userId, userId));
      expect(attachments.length).toBe(1);
      expect(attachments[0].fileLocation).toBe(filePath);

      const translations = await db
        .select()
        .from(flashcardTranslation)

      expect(translations.length).toBe(2);
      expect(translations.find((t) => t.word === "apple")?.translation).toBe(
        "Apfel"
      );
      expect(translations.find((t) => t.word === "house")?.translation).toBe(
        "Haus"
      );

      const imports = await db.select().from(flashcardImport);
      expect(imports.length).toBe(2);
    });

    it("should handle invalid CSV data", async () => {
      // Arrange
      const filePath = "invalid-import.csv";
      const csvContent = "word,translation\napple,\nhouse,Haus";

      // Act
      const result = await service.importTranslationsFromCsv(
        csvContent,
        filePath,
        userId,
        targetLanguage
      );

      // Assert
      expect(result.meta.total).toBe(2);
      expect(result.meta.success).toBe(1); // One valid row
      expect(result.meta.failed).toBe(1); // One invalid row

      // Verify only valid translations were imported
      const translations = await db
        .select()
        .from(flashcardTranslation)
      expect(translations.length).toBe(1);
      expect(translations[0].word).toBe("house");
    });
  });

  describe("getTranslationsFromAttachment", () => {
    it("should retrieve translations for an attachment", async () => {
      // Arrange - First create test data
      const filePath = "test-import-3.csv";
      const csvContent = "word,translation\ncar,Auto\nbook,Buch";

      // Import data first
      const importResult = await service.importTranslationsFromCsv(
        csvContent,
        filePath,
        userId,
        targetLanguage
      );
      expect(importResult.meta.success).toBe(2);

      // Find the attachment ID
      const attachment = await db
        .select()
        .from(flashcardAttachment)
        .where(eq(flashcardAttachment.fileLocation, filePath))
        .limit(1);
      expect(attachment.length).toBe(1);

      // Act
      const result = await service.getTranslationsFromAttachment(
        attachment[0].attachmentId
      );

      // Assert
      expect(result.length).toBe(2);
      const words = result.map((r) => r.flashcard_translation?.word);
      expect(words).toContain("car");
      expect(words).toContain("book");
    });
  });

  describe("multiple file imports", () => {
    it("should handle multiple file imports and retrieve all translations", async () => {
      // Arrange - First file
      const file1Path = "german-animals.csv";
      const csvContent1 = "word,translation\ncat,Katze\ndog,Hund";

      // Second file
      const file2Path = "german-foods.csv";
      const csvContent2 = "word,translation\nbread,Brot\nmilk,Milch";

      // Act - Import both files
      const import1 = await service.importTranslationsFromCsv(
        csvContent1,
        file1Path,
        userId,
        targetLanguage
      );
      const import2 = await service.importTranslationsFromCsv(
        csvContent2,
        file2Path,
        userId,
        targetLanguage
      );

      // Assert imports were successful
      expect(import1.meta.success).toBe(2);
      expect(import2.meta.success).toBe(2);

      // Verify attachments
      const attachments = await db
        .select()
        .from(flashcardAttachment)
        .where(eq(flashcardAttachment.userId, userId));
      expect(attachments.length).toBe(2);

      // Verify all translations
      const translations = await db
        .select()
        .from(flashcardTranslation)
      expect(translations.length).toBe(4);

      // Verify imports
      const imports = await db.select().from(flashcardImport);
      expect(imports.length).toBe(4);

      // Verify translations from each attachment
      for (const attachment of attachments) {
        const attachmentTranslations =
          await service.getTranslationsFromAttachment(attachment.attachmentId);
        expect(attachmentTranslations.length).toBe(2);

        if (attachment.fileLocation === file1Path) {
          const words = attachmentTranslations.map(
            (r) => r.flashcard_translation?.word
          );
          expect(words).toContain("cat");
          expect(words).toContain("dog");
        } else {
          const words = attachmentTranslations.map(
            (r) => r.flashcard_translation?.word
          );
          expect(words).toContain("bread");
          expect(words).toContain("milk");
        }
      }
    });
  });
});
