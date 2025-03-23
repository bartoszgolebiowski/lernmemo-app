import { afterEach, beforeAll, describe, expect, it } from "vitest";
import path from "path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { PremiumAccessService, USAGE_THRESHOLDS } from "./premiumAccessService";
import { eq } from "drizzle-orm";
import { reset } from "drizzle-seed";
import { v4 as uuidv4 } from "uuid";
import * as schema from "~/db/schema";
import { DrizzleDatabase, createDatabaseSQLite } from "~/db/index";
import { actionTypes, userActions } from "~/db/schema/userAction";

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

describe("PremiumAccessService Integration Tests", () => {
  let db: DrizzleDatabase;
  let service: PremiumAccessService;

  beforeAll(async () => {
    db = await mockDatabaseAndMigration();
    service = new PremiumAccessService(db);
  });

  afterEach(async () => {
    await reset(db, schema);
  });

  describe("trackAction", () => {
    it("should successfully track a user action", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.IMAGE_IMPORT;

      // Act
      await service.trackAction(userId, action);

      // Assert
      const records = await db
        .select()
        .from(userActions)
        .where(eq(userActions.userId, userId));

      expect(records.length).toBe(1);
      expect(records[0].userId).toBe(userId);
      expect(records[0].action).toBe(action);
    });

    it("should track multiple actions for the same user", async () => {
      // Arrange
      const userId = uuidv4();

      // Act
      await service.trackAction(userId, actionTypes.IMAGE_IMPORT);
      await service.trackAction(userId, actionTypes.CSV_IMPORT);
      await service.trackAction(userId, actionTypes.CREATE_GAME);

      // Assert
      const records = await db
        .select()
        .from(userActions)
        .where(eq(userActions.userId, userId));

      expect(records.length).toBe(3);

      const actions = records.map((r) => r.action);
      expect(actions).toContain(actionTypes.IMAGE_IMPORT);
      expect(actions).toContain(actionTypes.CSV_IMPORT);
      expect(actions).toContain(actionTypes.CREATE_GAME);
    });
  });

  describe("canPerformAction", () => {
    it("should allow action for freemium user under the limit", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.IMAGE_IMPORT;
      const isPremium = false;

      // Seed 4 actions (limit for freemium is 5)
      for (let i = 0; i < USAGE_THRESHOLDS.freemium.IMAGE_IMPORT - 1; i++) {
        await service.trackAction(userId, action);
      }

      // Act
      const result = await service.canPerformAction(userId, action, isPremium);

      // Assert
      expect(result).toBe(true);
    });

    it("should deny action for freemium user at the limit", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.IMAGE_IMPORT;
      const isPremium = false;

      // Seed 5 actions (limit for freemium is 5)
      for (let i = 0; i < USAGE_THRESHOLDS.freemium.IMAGE_IMPORT; i++) {
        await service.trackAction(userId, action);
      }

      // Act
      const result = await service.canPerformAction(userId, action, isPremium);

      // Assert
      expect(result).toBe(false);
    });

    it("should allow action for premium user under the limit", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.IMAGE_IMPORT;
      const isPremium = true;

      // Seed 99 actions (limit for premium is 100)
      for (let i = 0; i < USAGE_THRESHOLDS.premium.IMAGE_IMPORT - 1; i++) {
        await service.trackAction(userId, action);
      }

      // Act
      const result = await service.canPerformAction(userId, action, isPremium);

      // Assert
      expect(result).toBe(true);
    });

    it("should deny action for premium user at the limit", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.IMAGE_IMPORT;
      const isPremium = true;

      // Seed 100 actions (limit for premium is 100)
      for (let i = 0; i < USAGE_THRESHOLDS.premium.IMAGE_IMPORT; i++) {
        await service.trackAction(userId, action);
      }

      // Act
      const result = await service.canPerformAction(userId, action, isPremium);

      // Assert
      expect(result).toBe(false);
    });

    it("should not count actions from different days", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.IMAGE_IMPORT;
      const isPremium = false;

      // Manually insert actions with a past date (yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISOString = yesterday.toISOString();

      // Insert 5 actions from yesterday
      for (let i = 0; i < 5; i++) {
        await db.insert(userActions).values({
          userId,
          action,
          createdAt: yesterdayISOString,
        });
      }

      // Act
      const result = await service.canPerformAction(userId, action, isPremium);

      // Assert - should be allowed because yesterday's actions don't count
      expect(result).toBe(true);
    });
  });

  describe("performAction", () => {
    it("should perform and track action when under limit", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.CSV_IMPORT;
      const isPremium = false;

      // Seed 1 action (limit for freemium CSV_IMPORT is 2)
      await service.trackAction(userId, action);

      // Act
      const result = await service.performAction(userId, action, isPremium);

      // Assert
      expect(result).toBe(true);

      // Verify action was tracked
      const records = await db
        .select()
        .from(userActions)
        .where(eq(userActions.userId, userId));

      expect(records.length).toBe(2);
    });

    it("should not perform action when at limit", async () => {
      // Arrange
      const userId = uuidv4();
      const action = actionTypes.CSV_IMPORT;
      const isPremium = false;

      // Seed 2 actions (limit for freemium CSV_IMPORT is 2)
      for (let i = 0; i < USAGE_THRESHOLDS.freemium.CSV_IMPORT; i++) {
        await service.trackAction(userId, action);
      }

      // Act
      const result = await service.performAction(userId, action, isPremium);

      // Assert
      expect(result).toBe(false);

      // Verify no additional action was tracked
      const records = await db
        .select()
        .from(userActions)
        .where(eq(userActions.userId, userId));

      expect(records.length).toBe(2);
    });
  });

  describe("getRemainingActions", () => {
    it("should return correct remaining actions for freemium user", async () => {
      // Arrange
      const userId = uuidv4();
      const isPremium = false;

      // Seed some actions
      await service.trackAction(userId, actionTypes.IMAGE_IMPORT);
      await service.trackAction(userId, actionTypes.IMAGE_IMPORT);
      await service.trackAction(userId, actionTypes.CSV_IMPORT);

      // Act
      const result = await service.getRemainingActions(userId, isPremium);

      // Assert
      expect(result[actionTypes.IMAGE_IMPORT]).toBe(
        USAGE_THRESHOLDS.freemium.IMAGE_IMPORT - 2
      );
      expect(result[actionTypes.CSV_IMPORT]).toBe(
        USAGE_THRESHOLDS.freemium.CSV_IMPORT - 1
      );
      expect(result[actionTypes.CREATE_GAME]).toBe(
        USAGE_THRESHOLDS.freemium.CREATE_GAME
      );
    });

    it("should return correct remaining actions for premium user", async () => {
      // Arrange
      const userId = uuidv4();
      const isPremium = true;

      // Seed some actions
      // Seed actions to reach the limit
      for (let i = 0; i < 3; i++) {
        await service.trackAction(userId, actionTypes.IMAGE_IMPORT);
      }
      for (let i = 0; i < 3; i++) {
        await service.trackAction(userId, actionTypes.CREATE_GAME);
      }
      for (let i = 0; i < 3; i++) {
        await service.trackAction(userId, actionTypes.CSV_IMPORT);
      }
      // Act
      const result = await service.getRemainingActions(userId, isPremium);

      // Assert
      expect(result[actionTypes.IMAGE_IMPORT]).toBe(
        USAGE_THRESHOLDS.premium.IMAGE_IMPORT - 3
      );
      expect(result[actionTypes.CSV_IMPORT]).toBe(
        USAGE_THRESHOLDS.premium.CSV_IMPORT - 3
      );
      expect(result[actionTypes.CREATE_GAME]).toBe(
        USAGE_THRESHOLDS.premium.CREATE_GAME - 3
      );
    });

    it("should return zero for actions at or over the limit", async () => {
      // Arrange
      const userId = uuidv4();
      const isPremium = false;

      // Seed actions to reach the limit
      for (let i = 0; i < USAGE_THRESHOLDS.freemium.IMAGE_IMPORT; i++) {
        await service.trackAction(userId, actionTypes.IMAGE_IMPORT);
      }
      for (let i = 0; i < USAGE_THRESHOLDS.freemium.CREATE_GAME; i++) {
        await service.trackAction(userId, actionTypes.CREATE_GAME);
      }

      // Act
      const result = await service.getRemainingActions(userId, isPremium);

      // Assert
      // Assert
      expect(result[actionTypes.IMAGE_IMPORT]).toBe(0);
      expect(result[actionTypes.CSV_IMPORT]).toBe(
        USAGE_THRESHOLDS.freemium.CSV_IMPORT
      );
      expect(result[actionTypes.CREATE_GAME]).toBe(0);
    });

    it("should count only actions from the current day", async () => {
      // Arrange
      const userId = uuidv4();
      const isPremium = false;

      // Manually insert actions with a past date (yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISOString = yesterday.toISOString();

      // Insert 5 actions from yesterday and 2 from today
      for (let i = 0; i < 5; i++) {
        await db.insert(userActions).values({
          userId,
          action: actionTypes.IMAGE_IMPORT,
          createdAt: yesterdayISOString,
        });
      }

      await service.trackAction(userId, actionTypes.IMAGE_IMPORT);

      // Act
      const result = await service.getRemainingActions(userId, isPremium);

      // Assert - should only count today's actions
      expect(result[actionTypes.IMAGE_IMPORT]).toBe(1); //
    });
  });
});
