import { eq, desc } from "drizzle-orm";
import { DrizzleDatabase } from "~/db/index";
import {
  subscriptionPlans,
  subscription,
  subscriptionEventTypes,
  type SubscriptionPlan,
} from "~/db/schema/subscription";
import { v4 as uuidv4 } from "uuid";

export class SubscriptionService {
  constructor(private db: DrizzleDatabase) {}

  /**
   * Add a subscription for a user
   * @param userId The user's ID
   * @param plan The subscription plan (defaults to monthly)
   * @returns The created subscription event
   */
  async addSubscription(
    userId: string,
    plan: SubscriptionPlan = subscriptionPlans.MONTHLY
  ) {
    const subscribedAt = new Date();
    const expiresAt = new Date(subscribedAt);

    // Set expiration based on plan
    if (plan === subscriptionPlans.MONTHLY) {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Generate a new subscription group ID
    const subscriptionGroupId = uuidv4();

    // Create subscription event record - the only record we need
    const [subscriptionEvent] = await this.db
      .insert(subscription)
      .values({
        userId,
        eventType: subscriptionEventTypes.SUBSCRIPTION_CREATED,
        plan,
        expiresAt: expiresAt.toISOString(),
        subscriptionGroupId,
        metadata: JSON.stringify({
          createdAt: subscribedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        }),
      })
      .returning();

    return subscriptionEvent;
  }

  /**
   * Check if a user has an active premium subscription
   * @param userId The user's ID
   * @returns boolean indicating if the user has premium access
   */
  async isPremium(userId: string): Promise<boolean> {
    const now = new Date();

    // Get all subscription group IDs for this user
    const subscriptionGroupsResult = await this.db
      .select({ subscriptionGroupId: subscription.subscriptionGroupId })
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .groupBy(subscription.subscriptionGroupId);

    // For each subscription group, determine if it's active
    for (const { subscriptionGroupId } of subscriptionGroupsResult) {
      // Get all events for this subscription group, ordered by creation date
      const events = await this.db
        .select()
        .from(subscription)
        .where(eq(subscription.subscriptionGroupId, subscriptionGroupId))
        .orderBy(desc(subscription.createdAt));

      if (events.length === 0) continue;

      // Check the latest event for this subscription group
      const latestEvent = events[0];

      // If it's a cancellation or expiration event, this subscription is not active
      if (
        latestEvent.eventType ===
          subscriptionEventTypes.SUBSCRIPTION_CANCELED ||
        latestEvent.eventType === subscriptionEventTypes.SUBSCRIPTION_EXPIRED
      ) {
        continue;
      }

      // For creation or renewal events, check if the subscription is still valid
      if (latestEvent.expiresAt && new Date(latestEvent.expiresAt) > now) {
        return true; // Found an active subscription
      }
    }

    return false;
  }

  /**
   * Get the user's active subscription details if any
   * @param userId The user's ID
   * @returns The active subscription details or null
   */
  async getActiveSubscription(userId: string) {
    const now = new Date();
    let activeSubscription = null;

    // Get all subscription groups for this user
    const subscriptionGroupsResult = await this.db
      .select({ subscriptionGroupId: subscription.subscriptionGroupId })
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .groupBy(subscription.subscriptionGroupId);

    // Find the first active subscription
    for (const { subscriptionGroupId } of subscriptionGroupsResult) {
      // Get all events for this subscription group, ordered by creation date
      const events = await this.db
        .select()
        .from(subscription)
        .where(eq(subscription.subscriptionGroupId, subscriptionGroupId))
        .orderBy(desc(subscription.createdAt));

      if (events.length === 0) continue;

      const latestEvent = events[0];

      // Skip canceled or expired subscriptions
      if (
        latestEvent.eventType ===
          subscriptionEventTypes.SUBSCRIPTION_CANCELED ||
        latestEvent.eventType === subscriptionEventTypes.SUBSCRIPTION_EXPIRED
      ) {
        continue;
      }

      // Check if still valid
      if (latestEvent.expiresAt && new Date(latestEvent.expiresAt) > now) {
        // Found an active subscription, reconstruct a subscription object
        activeSubscription = {
          id: subscriptionGroupId, // Use the group ID as the subscription ID
          userId: latestEvent.userId,
          plan: latestEvent.plan,
          expiresAt: latestEvent.expiresAt,
          createdAt: events[events.length - 1].createdAt, // First event's creation date
          status: "ACTIVE",
        };
        break;
      }
    }

    return activeSubscription;
  }

  /**
   * Cancel a user's subscription
   * @param userId The user's ID
   * @returns boolean indicating if the operation was successful
   */
  async cancelSubscription(userId: string): Promise<boolean> {
    // First find the active subscription
    const activeSubscription = await this.getActiveSubscription(userId);

    if (!activeSubscription) {
      return false;
    }

    // Add a cancellation event
    await this.db.insert(subscription).values({
      userId,
      eventType: subscriptionEventTypes.SUBSCRIPTION_CANCELED,
      subscriptionGroupId: activeSubscription.id, // Use the subscription ID as group ID
      metadata: JSON.stringify({
        canceledAt: new Date().toISOString(),
      }),
    });

    return true;
  }

  /**
   * Handle subscription expiration (can be called by a scheduler)
   */
  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date().toISOString();

    // Get all subscription groups
    const subscriptionGroupsResult = await this.db
      .select({
        subscriptionGroupId: subscription.subscriptionGroupId,
        userId: subscription.userId,
      })
      .from(subscription)
      .groupBy(subscription.subscriptionGroupId);

    for (const { subscriptionGroupId, userId } of subscriptionGroupsResult) {
      // Get latest event for this group
      const [latestEvent] = await this.db
        .select()
        .from(subscription)
        .where(eq(subscription.subscriptionGroupId, subscriptionGroupId))
        .orderBy(desc(subscription.createdAt))
        .limit(1);

      if (!latestEvent) continue;

      // Skip if already canceled or expired
      if (
        latestEvent.eventType ===
          subscriptionEventTypes.SUBSCRIPTION_CANCELED ||
        latestEvent.eventType === subscriptionEventTypes.SUBSCRIPTION_EXPIRED
      ) {
        continue;
      }

      // Check if expired
      if (
        latestEvent.expiresAt &&
        new Date(latestEvent.expiresAt) <= new Date()
      ) {
        // Create expiration event
        await this.db.insert(subscription).values({
          userId,
          eventType: subscriptionEventTypes.SUBSCRIPTION_EXPIRED,
          subscriptionGroupId,
          metadata: JSON.stringify({
            expiredAt: now,
            originalExpiryDate: latestEvent.expiresAt,
          }),
        });
      }
    }
  }

  /**
   * Renew a subscription
   * @param userId The user's ID
   * @returns boolean indicating if the operation was successful
   */
  async renewSubscription(
    userId: string,
    plan: SubscriptionPlan = subscriptionPlans.MONTHLY
  ): Promise<boolean> {
    // Find the current/latest subscription
    const activeSubscription = await this.getActiveSubscription(userId);

    if (!activeSubscription) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(now);

    // Set new expiration based on plan
    if (plan === subscriptionPlans.MONTHLY) {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Create renewal event
    await this.db.insert(subscription).values({
      userId,
      eventType: subscriptionEventTypes.SUBSCRIPTION_RENEWED,
      plan,
      expiresAt: expiresAt.toISOString(),
      subscriptionGroupId: activeSubscription.id,
      metadata: JSON.stringify({
        renewedAt: now.toISOString(),
        previousExpiryDate: activeSubscription.expiresAt,
      }),
    });

    return true;
  }

  /**
   * Get subscription history for a user
   * @param userId The user's ID
   * @returns Array of subscription events
   */
  async getSubscriptionHistory(userId: string) {
    const events = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .orderBy(desc(subscription.createdAt));

    return events;
  }
}

export function createSubscriptionService(db: DrizzleDatabase) {
  return new SubscriptionService(db);
}
