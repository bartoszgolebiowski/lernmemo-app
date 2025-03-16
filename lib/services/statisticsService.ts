import { DrizzleDatabase } from "~/db/index";
import { eq, and, count, sql, gt, isNull } from "drizzle-orm";
import {
  flashcardGameAnswer,
  flashcardAttachment,
  flashcardImport,
  flashcardGame,
} from "~/db/schema/flashcard";

export class StatisticsService {
  constructor(private db: DrizzleDatabase) {}

  /**
   * Get the number of cards reviewed by the user today
   */
  async getCardsReviewedToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const result = await this.db
      .select({ count: count() })
      .from(flashcardGameAnswer)
      .innerJoin(
        flashcardGame,
        eq(flashcardGameAnswer.gameId, flashcardGame.gameId)
      )
      .where(
        and(
          eq(flashcardGame.userId, userId),
          gt(flashcardGame.createdAt, todayIso)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get the number of cards added by the user
   */
  async getCardsAvailable(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(flashcardImport)
      .innerJoin(
        flashcardAttachment,
        eq(flashcardImport.attachmentId, flashcardAttachment.attachmentId)
      )
      .where(
        and(
          eq(flashcardAttachment.userId, userId),
          isNull(flashcardAttachment.deactivatedAt)
        )
      );

    return result[0]?.count || 0;
  }

  // New method to get total cards reviewed by the user across all time
  async getTotalCardsReviewed(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(flashcardGameAnswer)
      .innerJoin(flashcardGame, eq(flashcardGameAnswer.gameId, flashcardGame.gameId))
      .where(eq(flashcardGame.userId, userId));
    return result[0]?.count || 0;
  }

  /**
   * Get all user stats in a single call
   */
  async getUserStats(userId: string) {
    const [cardsReviewedToday, cardsAvailable, cardsReviewedAllTime] = await Promise.all([
      this.getCardsReviewedToday(userId),
      this.getCardsAvailable(userId),
      this.getTotalCardsReviewed(userId)
    ]);
    // You may now include total viewed cards if needed
    return {
      cardsReviewedToday,
      cardsAvailable,
      cardsReviewedAllTime,
    };
  }
}

// Factory function to create the service
export function createStatisticsService(db: DrizzleDatabase) {
  return new StatisticsService(db);
}
