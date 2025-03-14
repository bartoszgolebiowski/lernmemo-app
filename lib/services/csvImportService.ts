import { z } from "zod";
import { zcsv, parseCSVContent } from "zod-csv";
import { DrizzleDatabase } from "~/db/index";
import {
  flashcardAttachment,
  flashcardImport,
  flashcardTranslation,
} from "~/db/schema/flashcard";
import { eq } from "drizzle-orm";

// Define the schema for a single row in the CSV
const FlashcardRowSchema = z.object({
  word: zcsv.string(z.string().min(1, "Word is required")),
  translation: zcsv.string(z.string().min(1, "Translation is required")),
});

// Service for importing CSV files
export class CsvImportService {
  constructor(private db: DrizzleDatabase) {}

  /**
   * Validates and imports a CSV file of translations
   * @param csvContent The CSV file to import
   * @param filePath Original file name
   * @param userId User ID performing the import
   * @returns Results of the import operation
   */
  async importTranslationsFromCsv(
    csvContent: string,
    filePath: string,
    userId: string,
    targetLanguage: string
  ) {
    const csv = parseCSVContent(csvContent, FlashcardRowSchema);
    const translationsData = csv.validRows.map((row) => ({
      word: row.word,
      translation: row.translation,
      targetLanguage,
    }));

    const persisted = await this.db.transaction(async (tx) => {
      // Insert translations to the database
      const attachmentData = { fileLocation: filePath, userId };

      const attachments = await tx
        .insert(flashcardAttachment)
        .values(attachmentData)
        .returning();

      const attachment = attachments.at(0);

      if (!attachment) {
        throw new Error("Attachment not found");
      }

      const translations = await tx
        .insert(flashcardTranslation)
        .values(translationsData)
        .returning();

      const importsData = translations.map((t) => ({
        attachmentId: attachment.attachmentId,
        translationId: t.translationId,
      }));

      const imports = await tx
        .insert(flashcardImport)
        .values(importsData)
        .returning();

      return {
        attachment,
        translations,
        imports,
      };
    });

    return {
      translations: persisted.translations,
      attachment: persisted.attachment,
      imports: persisted.imports,
      meta: {
        total: csv.allRows.length,
        success: persisted.translations.length,
        failed: csv.allRows.length - persisted.translations.length,
      },
    };
  }

  /**
   * Get imported translations from an attachment
   */
  async getTranslationsFromAttachment(attachmentId: string) {
    return this.db
      .select()
      .from(flashcardImport)
      .leftJoin(
        flashcardTranslation,
        eq(flashcardImport.translationId, flashcardTranslation.translationId)
      )
      .where(eq(flashcardImport.attachmentId, attachmentId));
  }
}

// Factory function to create the service
export function createCsvImportService(db: DrizzleDatabase) {
  return new CsvImportService(db);
}
