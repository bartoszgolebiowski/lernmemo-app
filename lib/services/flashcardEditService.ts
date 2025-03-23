import { and, eq, isNull } from "drizzle-orm";
import { DrizzleDatabase } from "~/db/index";
import {
  flashcardAttachment,
  flashcardTranslation,
  flashcardImport,
} from "~/db/schema/flashcard";
import { z } from "zod";

// Define types for the service
export type Translation = {
  id?: string;
  translation: string;
  word: string;
  targetLanguage: string;
  isDeleted?: boolean;
};

export type FlashcardData = {
  attachmentId: string;
  userId: string;
  translations: Translation[];
  fileLocation: string;
  targetLanguage: string;
};

export type FlashcardUpdatePayload = {
  translations: Translation[];
};

// Validation schemas
const translationSchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1, "Word is required"),
  translation: z.string().min(1, "Translation is required"),
  targetLanguage: z.string().default("auto"),
  isDeleted: z.boolean().optional(),
});

const flashcardUpdateSchema = z.object({
  translations: z
    .array(translationSchema)
    .min(1, "At least one translation is required"),
});

export class FlashcardEditService {
  constructor(private db: DrizzleDatabase) {}

  /**
   * Fetches flashcard data by attachmentId, ensuring it belongs to the specified user
   * @param attachmentId ID of the flashcard attachment to retrieve
   * @param userId ID of the user who should own the attachment
   * @returns Flashcard data with translations or null if not found
   */
  async fetchFlashcardDetails(
    attachmentId: string,
    userId: string
  ): Promise<FlashcardData | null> {
    try {
      // Query the attachment ensuring it belongs to the user
      const attachments = await this.db
        .select()
        .from(flashcardAttachment)
        .where(
          and(
            eq(flashcardAttachment.attachmentId, attachmentId),
            eq(flashcardAttachment.userId, userId)
          )
        );

      if (!attachments.length) {
        return null;
      }

      const attachment = attachments[0];

      // Query the translations for this attachment via the import table
      const translationsQuery = await this.db
        .select({
          translationData: flashcardTranslation,
          importData: flashcardImport,
        })
        .from(flashcardImport)
        .innerJoin(
          flashcardTranslation,
          eq(flashcardImport.translationId, flashcardTranslation.translationId)
        )
        .where(
          and(
            eq(flashcardImport.attachmentId, attachmentId),
            isNull(flashcardTranslation.deactivatedAt)
          )
        );

      // Format the translations
      const translations = translationsQuery.map(({ translationData }) => ({
        id: translationData.translationId,
        word: translationData.word,
        translation: translationData.translation,
        targetLanguage: translationData.targetLanguage,
      }));

      if (!translations.length) {
        throw new Error("No translations found for this flashcard");
      }
      // Return the complete flashcard data
      return {
        attachmentId: attachment.attachmentId,
        userId: attachment.userId,
        fileLocation: attachment.fileLocation,
        translations,
        targetLanguage: translationsQuery[0].translationData.targetLanguage,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message ?? "Failed to fetch flashcard details", {
          cause: error,
        });
      }
      throw error;
    }
  }

  /**
   * Updates flashcard translations
   * @param attachmentId ID of the attachment to update
   * @param data The updated flashcard data
   * @param userId ID of the user who owns the attachment
   * @returns The updated flashcard data or null if validation fails
   */
  async updateFlashcard(
    attachmentId: string,
    data: FlashcardUpdatePayload,
    userId: string
  ): Promise<FlashcardData | null> {
    try {
      // Validate the update payload
      const validation = flashcardUpdateSchema.safeParse(data);
      if (!validation.success) {
        return null;
      }

      // Verify ownership of the flashcard attachment
      const existingAttachment = await this.db
        .select()
        .from(flashcardAttachment)
        .where(
          and(
            eq(flashcardAttachment.attachmentId, attachmentId),
            eq(flashcardAttachment.userId, userId)
          )
        );

      if (!existingAttachment.length) {
        throw new Error("Flashcard attachment not found or access denied");
      }

      // Start a transaction to ensure data consistency
      return await this.db.transaction(async (tx) => {
        // Get existing translations for this attachment
        const existingTranslationsQuery = await tx
          .select({
            translationId: flashcardTranslation.translationId,
            importData: flashcardImport,
          })
          .from(flashcardImport)
          .innerJoin(
            flashcardTranslation,
            eq(
              flashcardImport.translationId,
              flashcardTranslation.translationId
            )
          )
          .where(eq(flashcardImport.attachmentId, attachmentId));

        const existingTranslationIds = new Set(
          existingTranslationsQuery.map((t) => t.translationId)
        );

        // Process translations: update existing, add new ones
        for (const translation of data.translations) {
          if (translation.id && existingTranslationIds.has(translation.id)) {
            // Update the translation
            await tx
              .update(flashcardTranslation)
              .set({
                word: translation.word,
                translation: translation.translation,
                targetLanguage: translation.targetLanguage,
                deactivatedAt: translation.isDeleted
                  ? new Date().toISOString()
                  : null,
              })
              .where(eq(flashcardTranslation.translationId, translation.id));
          } else if (!translation.isDeleted) {
            // New translation - insert and link to this attachment
            const newTranslation = await tx
              .insert(flashcardTranslation)
              .values({
                word: translation.word,
                translation: translation.translation,
                targetLanguage: translation.targetLanguage || "auto",
              })
              .returning();

            if (newTranslation.length) {
              await tx.insert(flashcardImport).values({
                attachmentId,
                translationId: newTranslation[0].translationId,
              });
            }
          }
        }

        // Fetch the updated translations within the transaction context
        // instead of calling this.fetchFlashcardDetails
        const attachment = await tx
          .select()
          .from(flashcardAttachment)
          .where(
            and(
              eq(flashcardAttachment.attachmentId, attachmentId),
              eq(flashcardAttachment.userId, userId)
            )
          )
          .then((results) => results[0]);

        if (!attachment) {
          throw new Error("Attachment not found after update");
        }

        // Query the translations for this attachment within the transaction
        const translationsQuery = await tx
          .select({
            translationData: flashcardTranslation,
          })
          .from(flashcardImport)
          .innerJoin(
            flashcardTranslation,
            eq(
              flashcardImport.translationId,
              flashcardTranslation.translationId
            )
          )
          .where(
            and(
              eq(flashcardImport.attachmentId, attachmentId),
              isNull(flashcardTranslation.deactivatedAt)
            )
          );

        // Format the translations
        const translations = translationsQuery.map(({ translationData }) => ({
          id: translationData.translationId,
          word: translationData.word,
          translation: translationData.translation,
          targetLanguage: translationData.targetLanguage,
        }));

        if (!translations.length) {
          throw new Error("No translations found for this flashcard");
        }
        // Return the complete flashcard data
        return {
          attachmentId: attachment.attachmentId,
          userId: attachment.userId,
          fileLocation: attachment.fileLocation,
          translations,
          targetLanguage: translationsQuery[0].translationData.targetLanguage,
        };
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message ?? "Failed to update flashcard", {
          cause: error,
        });
      }
      throw error;
    }
  }
}

// Factory function to create the service
export function createFlashcardEditService(db: DrizzleDatabase) {
  return new FlashcardEditService(db);
}
