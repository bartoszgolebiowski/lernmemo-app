import { defineConfig } from "drizzle-kit";
import { env } from "./lib/env";

export default defineConfig({
  schema: "./db/schema",
  out: "./db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DB_FILE_NAME,
    // url: env.TURSO_CONNECTION_URL,
    // authToken: env.TURSO_AUTH_TOKEN,
  },
});
