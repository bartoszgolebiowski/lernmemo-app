import { defineConfig } from "drizzle-kit";
import { env } from "./lib/env";

export default defineConfig({
  out: "./db/migrations",
  schema: "./db/schema",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DB_FILE_NAME,
  },
});
