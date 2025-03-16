import { and, desc, eq } from "drizzle-orm";
import { DrizzleDatabase } from "~/db/index";
import { flashcardAttachment } from "~/db/schema/flashcard";

export class AttachmentService {
  constructor(private db: DrizzleDatabase) {}

  /**
   * Retrieves all flashcard attachments for a specific user
   * @param userId ID of the user to get attachments for
   * @returns Array of attachment objects belonging to the user
   */
  async getUserAttachments(userId: string) {
    try {
      const attachments = await this.db
        .select()
        .from(flashcardAttachment)
        .where(eq(flashcardAttachment.userId, userId));

      return attachments;
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

  // get last attachment by user id
  async getLastAttachmentByUserId(userId: string) {
    try {
      const attachments = await this.db
        .select()
        .from(flashcardAttachment)
        .where(eq(flashcardAttachment.userId, userId))
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
