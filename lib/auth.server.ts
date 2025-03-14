import { betterAuth } from "better-auth";
import { env } from "./env";
import { LibsqlDialect } from "@libsql/kysely-libsql";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: {
    type: "sqlite",
    dialect: new LibsqlDialect({
      url: env.DB_FILE_NAME,
    }),
  },
});
