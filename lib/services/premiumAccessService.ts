import { and, eq, gte, sql } from "drizzle-orm";
import { DrizzleDatabase } from "~/db/index";
import { ActionType, actionTypes, userActions } from "~/db/schema/userAction";

// Threshold configuration for different user types
const USAGE_THRESHOLDS = {
  freemium: {
    [actionTypes.IMAGE_IMPORT]: 5, // 5 image imports per day
    [actionTypes.CSV_IMPORT]: 2, // 2 CSV imports per day
    [actionTypes.CREATE_GAME]: 3, // 3 games created per day
  },
  premium: {
    [actionTypes.IMAGE_IMPORT]: 100, // 100 image imports per day
    [actionTypes.CSV_IMPORT]: 50, // 50 CSV imports per day
    [actionTypes.CREATE_GAME]: 20, // 20 games created per day
  },
};

export class PremiumAccessService {
  constructor(private db: DrizzleDatabase) {}
  /**
   * Track a user action
   * @param userId The user's ID
   * @param action The action performed
   */
  async trackAction(userId: string, action: ActionType): Promise<void> {
    await this.db.insert(userActions).values({
      userId,
      action,
    });
  }

  /**
   * Check if a user can perform an action based on their account type
   * @param userId The user's ID
   * @param action The action to check
   * @param isPremium Whether the user has a premium account
   * @returns boolean indicating if the action is allowed
   */
  async canPerformAction(
    userId: string,
    action: ActionType,
    isPremium: boolean
  ): Promise<boolean> {
    // Get the start of the current day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISOString = startOfDay.toISOString();

    // Count actions performed today
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userActions)
      .where(
        and(
          eq(userActions.userId, userId),
          eq(userActions.action, action),
          gte(userActions.createdAt, startOfDayISOString)
        )
      );

    const count = result[0]?.count || 0;
    const threshold = isPremium
      ? USAGE_THRESHOLDS.premium[action]
      : USAGE_THRESHOLDS.freemium[action];

    return count < threshold;
  }

  /**
   * Perform an action if the user has not exceeded their limit
   * @param userId The user's ID
   * @param action The action to perform
   * @param isPremium Whether the user has a premium account
   * @returns boolean indicating if the action was performed
   */
  async performAction(
    userId: string,
    action: ActionType,
    isPremium: boolean
  ): Promise<boolean> {
    const canPerform = await this.canPerformAction(userId, action, isPremium);

    if (canPerform) {
      await this.trackAction(userId, action);
      return true;
    }

    return false;
  }

  /**
   * Get the remaining actions for a user
   * @param userId The user's ID
   * @param isPremium Whether the user has a premium account
   * @returns Object containing the remaining actions for each action type
   */
  async getRemainingActions(
    userId: string,
    isPremium: boolean
  ): Promise<Record<ActionType, number>> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISOString = startOfDay.toISOString();

    const thresholds = isPremium
      ? USAGE_THRESHOLDS.premium
      : USAGE_THRESHOLDS.freemium;
    const result: Record<ActionType, number> = {} as Record<ActionType, number>;

    for (const action of Object.values(actionTypes)) {
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(userActions)
        .where(
          and(
            eq(userActions.userId, userId),
            eq(userActions.action, action),
            gte(userActions.createdAt, startOfDayISOString)
          )
        );

      const usedCount = countResult[0]?.count || 0;
      result[action] = Math.max(0, thresholds[action] - usedCount);
    }

    return result;
  }
}

export function createPremiumAccessService(db: DrizzleDatabase) {
  return new PremiumAccessService(db);
}
