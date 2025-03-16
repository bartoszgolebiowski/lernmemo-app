import { and, desc, eq, isNull } from "drizzle-orm";
import { DrizzleDatabase } from "~/db/index";
import { flashcardAttachment } from "~/db/schema/flashcard";
import { createCsvImportService } from "~/lib/services/csvImportService";

export class AttachmentService {
  constructor(private db: DrizzleDatabase) {}

  /**
   * Retrieves all flashcard attachments for a specific user
   * @param userId ID of the user to get attachments for
   * @returns Array of attachment objects with translation counts, target language, and translations list
   */
  async getUserAttachments(userId: string) {
    try {
      const attachments = await this.db
        .select()
        .from(flashcardAttachment)
        .where(eq(flashcardAttachment.userId, userId))
        .orderBy(desc(flashcardAttachment.importedAt));

      // Get translations data for each attachment
      const importService = createCsvImportService(this.db);
      const translationsPromises = attachments.map(attachment => 
        importService.getTranslationsFromAttachment(attachment.attachmentId)
      );
      const translationsResults = await Promise.all(translationsPromises);

      // Enrich attachments with translation count, target language, and translations list
      return attachments.map((attachment, index) => {
        const translations = translationsResults[index];
        let targetLanguage = 'Unknown';
        
        if (translations.length > 0 && translations[0].flashcard_translation) {
          targetLanguage = translations[0].flashcard_translation.targetLanguage || 'Unknown';
        }
        
        return {
          ...attachment,
          translationCount: translations.length,
          targetLanguage,
          translations // Include the full translations list
        };
      });
    } catch (e) {
      console.error("Error fetching user attachments:", e);
      throw new Error("Failed to fetch user attachments");
    }
  }

  /**
   * Retrieves a single attachment by its ID
   * @param attachmentId ID of the attachment to retrieve
   * @returns Attachment object if found, null otherwise
   */

  async getAttachmentByIdAndUserId(attachmentId: string, userId: string) {
    try {
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

      return attachments[0];
    } catch (e) {
      console.error("Error fetching attachment:", e);
      throw new Error("Failed to fetch attachment");
    }
  }

  /**
   * Toggles the deactivation status of an attachment
   * @param attachmentId ID of the attachment to toggle
   * @param userId ID of the user who owns the attachment
   * @returns The updated attachment or null if not found
   */
  async toggleDeactivationAttachment(attachmentId: string, userId: string) {
    try {
      // First, verify the attachment exists and belongs to the user
      const attachment = await this.getAttachmentByIdAndUserId(attachmentId, userId);
      
      if (!attachment) {
        return null;
      }

      // Toggle the deactivation status
      const updatedAttachment = await this.db
        .update(flashcardAttachment)
        .set({
          deactivatedAt: attachment.deactivatedAt ? null : new Date().toISOString()
        })
        .where(
          and(
            eq(flashcardAttachment.attachmentId, attachmentId),
            eq(flashcardAttachment.userId, userId)
          )
        )
        .returning();

      if (!updatedAttachment.length) {
        return null;
      }

      return updatedAttachment[0];
    } catch (e) {
      console.error("Error toggling attachment activation status:", e);
      throw new Error("Failed to toggle attachment activation status");
    }
  }

  /**
   * Retrieves all active flashcard attachments for a specific user
   * (those without a deactivatedAt value)
   * @param userId ID of the user to get active attachments for
   * @returns Array of active attachment objects belonging to the user
   */
  async getActiveUserAttachments(userId: string) {
    try {
      const attachments = await this.db
        .select()
        .from(flashcardAttachment)
        .where(
          and(
            eq(flashcardAttachment.userId, userId),
            isNull(flashcardAttachment.deactivatedAt)
          )
        );

      return attachments;
    } catch (e) {
      console.error("Error fetching active user attachments:", e);
      throw new Error("Failed to fetch active user attachments");
    }
  }

  // get last attachment by user id
  async getLastAttachmentByUserId(userId: string) {
    try {
      const attachments = await this.db
        .select()
        .from(flashcardAttachment)
        .where(
          and(
            eq(flashcardAttachment.userId, userId),
            isNull(flashcardAttachment.deactivatedAt)
          )
        )
        .orderBy(desc(flashcardAttachment.importedAt))
        .limit(1);

      if (!attachments.length) {
        return null;
      }

      return attachments[0];
    } catch (e) {
      console.error("Error fetching attachment:", e);
      throw new Error("Failed to fetch attachment");
    }
  }
}

// Factory function to create the service
export function createAttachmentService(db: DrizzleDatabase) {
  return new AttachmentService(db);
}
