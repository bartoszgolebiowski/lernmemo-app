import { afterEach, beforeAll, describe, expect, it } from "vitest";
import path from "path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { SubscriptionService } from "./subscriptionService";
import { eq } from "drizzle-orm";
import { reset } from "drizzle-seed";
import { v4 as uuidv4 } from "uuid";
import * as schema from "~/db/schema";
import { DrizzleDatabase, createDatabaseSQLite } from "~/db/index";
import {
  subscription,
  subscriptionPlans,
  subscriptionEventTypes,
} from "~/db/schema/subscription";

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

describe("SubscriptionService Integration Tests", () => {
  let db: DrizzleDatabase;
  let service: SubscriptionService;

  beforeAll(async () => {
    db = await mockDatabaseAndMigration();
    service = new SubscriptionService(db);
  });

  afterEach(async () => {
    await reset(db, schema);
  });

  describe("addSubscription", () => {
    it("should create a new subscription event", async () => {
      // Arrange
      const userId = uuidv4();

      // Act
      const result = await service.addSubscription(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_CREATED
      );
      expect(result.plan).toBe(subscriptionPlans.MONTHLY);
      expect(result.expiresAt).toBeDefined();
      expect(result.subscriptionGroupId).toBeDefined();

      // Verify in database
      const subscriptions = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId));

      expect(subscriptions.length).toBe(1);
    });
  });

  describe("isPremium", () => {
    it("should return true when user has an active subscription", async () => {
      // Arrange
      const userId = uuidv4();
      await service.addSubscription(userId);

      // Act
      const result = await service.isPremium(userId);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user has no subscriptions", async () => {
      // Arrange
      const userId = uuidv4();

      // Act
      const result = await service.isPremium(userId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when subscription is expired", async () => {
      // Arrange
      const userId = uuidv4();

      // Add subscription with manually set expiration date in the past
      const subscribedAt = new Date();
      const expiresAt = new Date(subscribedAt);
      expiresAt.setMonth(expiresAt.getMonth() - 1); // Expired one month ago

      const subscriptionGroupId = uuidv4();

      await db.insert(subscription).values({
        userId,
        eventType: subscriptionEventTypes.SUBSCRIPTION_CREATED,
        plan: subscriptionPlans.MONTHLY,
        expiresAt: expiresAt.toISOString(),
        subscriptionGroupId,
        metadata: JSON.stringify({
          createdAt: subscribedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        }),
      });

      // Act
      const result = await service.isPremium(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getActiveSubscription", () => {
    it("should return the active subscription details", async () => {
      // Arrange
      const userId = uuidv4();
      const subscriptionEvent = await service.addSubscription(userId);

      // Act
      const activeSubscription = await service.getActiveSubscription(userId);

      // Assert
      expect(activeSubscription).not.toBeNull();
      expect(activeSubscription?.userId).toBe(userId);
      expect(activeSubscription?.plan).toBe(subscriptionPlans.MONTHLY);
      expect(activeSubscription?.id).toBe(
        subscriptionEvent.subscriptionGroupId
      );
      expect(activeSubscription?.status).toBe("ACTIVE");
    });

    it("should return null when no active subscription exists", async () => {
      // Arrange
      const userId = uuidv4();

      // Act
      const result = await service.getActiveSubscription(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("cancelSubscription", () => {
    it("should return true when cancellation is successful", async () => {
      // Arrange
      const userId = uuidv4();
      await service.addSubscription(userId);

      // Act
      const result = await service.cancelSubscription(userId);

      // Assert
      expect(result).toBe(true);

      // Verify cancellation event in database
      const events = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId))
        .orderBy(subscription.createdAt);

      expect(events.length).toBe(2);
      expect(events[1].eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_CANCELED
      );
    });

    it("should return false when user has no active subscription", async () => {
      // Arrange
      const userId = uuidv4();

      // Act
      await service.addSubscription(userId);
      await service.cancelSubscription(userId);
      const result = await service.isPremium(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("processExpiredSubscriptions", () => {
    it("should process expired subscriptions correctly", async () => {
      // Arrange
      const userId = uuidv4();

      // Add subscription with manually set expiration date in the past
      const subscribedAt = new Date();
      const expiresAt = new Date(subscribedAt);
      expiresAt.setMonth(expiresAt.getMonth() - 1); // Expired one month ago

      const subscriptionGroupId = uuidv4();

      await db.insert(subscription).values({
        userId,
        eventType: subscriptionEventTypes.SUBSCRIPTION_CREATED,
        plan: subscriptionPlans.MONTHLY,
        expiresAt: expiresAt.toISOString(),
        subscriptionGroupId,
        metadata: JSON.stringify({
          createdAt: subscribedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        }),
      });

      // Act
      await service.processExpiredSubscriptions();

      // Assert
      const events = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId))
        .orderBy(subscription.createdAt);

      expect(events.length).toBe(2);
      expect(events[1].eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_EXPIRED
      );
    });

    it("should skip already canceled or expired subscriptions", async () => {
      // Arrange
      const userId = uuidv4();
      await service.addSubscription(userId);
      await service.cancelSubscription(userId);

      // Act
      await service.processExpiredSubscriptions();

      // Assert
      const events = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId))
        .orderBy(subscription.createdAt);

      // Should still be only 2 events (create and cancel), no expiration added
      expect(events.length).toBe(2);
      expect(events[1].eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_CANCELED
      );
    });
  });

  describe("renewSubscription", () => {
    it("should renew an existing subscription", async () => {
      // Arrange
      const userId = uuidv4();
      await service.addSubscription(userId);

      // Act
      const result = await service.renewSubscription(userId);

      // Assert
      expect(result).toBe(true);

      // Verify renewal event in database
      const events = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId))
        .orderBy(subscription.createdAt);

      expect(events.length).toBe(2);
      expect(events[1].eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_RENEWED
      );
    });
  });

  describe("getSubscriptionHistory", () => {
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    it("should retrieve subscription history for a user", async () => {
      // Arrange
      const userId = uuidv4();
      await service.addSubscription(userId);
      await wait(1);
      await service.renewSubscription(userId);
      await wait(1);
      await service.cancelSubscription(userId);

      // Act
      const history = await service.getSubscriptionHistory(userId);

      // Assert
      expect(history.length).toBe(3);

      // Events should be in reverse chronological order (newest first)
      expect(history[0].eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_CANCELED
      );
      expect(history[1].eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_RENEWED
      );
      expect(history[2].eventType).toBe(
        subscriptionEventTypes.SUBSCRIPTION_CREATED
      );
    });

    it("should return empty array when user has no subscription history", async () => {
      // Arrange
      const userId = uuidv4();

      // Act
      const history = await service.getSubscriptionHistory(userId);

      // Assert
      expect(history.length).toBe(0);
    });
  });
});
