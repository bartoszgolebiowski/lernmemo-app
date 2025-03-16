import { DrizzleDatabase } from "~/db/index";
import { eq, and, count, sql, gt } from "drizzle-orm";
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
   * Get the number of cards added by the user today
   */
  async getCardsAddedToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Calculate the user's streak (consecutive days with activity)
   */
  async getStreakDays(userId: string): Promise<number> {
    // Get all unique dates when the user was active (either added cards or played games)
    const gameDates = await this.db
      .select({
        date: sql`strftime('%Y-%m-%d', ${flashcardGame.createdAt})`,
      })
      .from(flashcardGame)
      .where(eq(flashcardGame.userId, userId))
      .groupBy(sql`strftime('%Y-%m-%d', ${flashcardGame.createdAt})`);

    if (gameDates.length === 0) return 0;
    
    // Create a set of all dates for fast lookup
    const dateSet = new Set(gameDates.map(item => String(item.date)));
 
    // Format date helper function
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Start with today's date
    let currentDate = new Date();
    let currentDateString = formatDate(currentDate);
    
    // Check if today is in the set, otherwise check yesterday
    if (!dateSet.has(currentDateString)) {
      // Check yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = formatDate(yesterday);
      
      if (!dateSet.has(yesterdayString)) {
        return 0; // Streak broken - neither today nor yesterday has activity
      }
      
      // Start checking from yesterday instead
      currentDate = yesterday;
      currentDateString = yesterdayString;
    }
    
    // Found today or yesterday, so start with streak = 1
    let streak = 1;
    
    // Loop backwards checking each previous day
    while (true) {
      // Get previous day
      currentDate.setDate(currentDate.getDate() - 1);
      currentDateString = formatDate(currentDate);
      
      // Check if this date exists in our set
      if (dateSet.has(currentDateString)) {
        streak++;
      } else {
        // Date not found, streak is broken
        break;
      }
    }
    
    return streak;
  }

  /**
   * Get all user stats in a single call
   */
  async getUserStats(userId: string) {
    const [cardsToReview, cardsLearned, streakDays] = await Promise.all([
      this.getCardsReviewedToday(userId),
      this.getCardsAddedToday(userId),
      this.getStreakDays(userId),
    ]);

    return {
      cardsToReview,
      cardsLearned,
      streakDays,
    };
  }
}

// Factory function to create the service
export function createStatisticsService(db: DrizzleDatabase) {
  return new StatisticsService(db);
}
