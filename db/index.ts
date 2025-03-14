import { drizzle } from "drizzle-orm/libsql";
import { env } from "~/lib/env";

export const createDatabase = (url: string) => drizzle({ connection: { url } });
export const db = createDatabase(env.DB_FILE_NAME);
export type DrizzleDatabase = typeof db;
