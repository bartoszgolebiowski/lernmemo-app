import { drizzle } from "drizzle-orm/libsql";
import { env } from "~/lib/env";

export const createDatabaseTurso = (url: string, authToken: string) =>
  drizzle({
    connection: {
      url,
      authToken,
    },
  });

export const createDatabaseSQLite = (url: string) =>
  drizzle({ connection: { url } });

// export const db = createDatabaseTurso(
//   env.TURSO_CONNECTION_URL,
//   env.TURSO_AUTH_TOKEN
// );

export const db = createDatabaseSQLite(env.DB_FILE_NAME);
export type DrizzleDatabase = typeof db;
