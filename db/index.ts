import { drizzle } from "drizzle-orm/libsql";
import { env } from "~/lib/env";

const createDatabaseTurso = (
  url: string = env.TURSO_CONNECTION_URL,
  authToken: string
) =>
  drizzle({
    connection: {
      url,
      authToken,
    },
  });

export const createDatabaseSQLite = (url: string) =>
  drizzle({ connection: { url } });

export const db = createDatabaseTurso(
  env.TURSO_CONNECTION_URL,
  env.TURSO_AUTH_TOKEN
);

export type DrizzleDatabase = typeof db;
