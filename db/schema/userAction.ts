import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";

export const userActions = sqliteTable(
  "user_action",
  {
    actionId: text("id").$defaultFn(() => uuidv4()),
    userId: text("user_id", { length: 255 }).notNull(),
    action: text("action", { length: 255 }).notNull(),
    createdAt: text("created_at").$default(() => new Date().toISOString()),
  },
  (table) => [primaryKey({ columns: [table.actionId, table.createdAt] })]
);

// Action types
export const actionTypes = {
  IMAGE_IMPORT: "IMAGE_IMPORT",
  CSV_IMPORT: "CSV_IMPORT",
  CREATE_GAME: "CREATE_GAME",
} as const;

export type ActionType = keyof typeof actionTypes;
