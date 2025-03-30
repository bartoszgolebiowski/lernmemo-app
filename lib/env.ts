import { z } from "zod";

/**
 * Schema for environment variables
 */
const envSchema = z.object({
  DB_FILE_NAME: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_ENDPOINT: z.string().min(1),
  // TURSO_CONNECTION_URL: z.string().min(1),
  // TURSO_AUTH_TOKEN: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Parse and validate environment variables
 * This will throw an error if validation fails
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter(
          (issue) =>
            issue.code === "invalid_type" && issue.received === "undefined"
        )
        .map((issue) => issue.path.join("."));

      console.error("❌ Missing environment variables:");
      missingVars.forEach((variable) => {
        console.error(`   - ${variable}`);
      });

      console.error(
        "\nPlease check your .env file and ensure all required variables are set."
      );
    }

    throw new Error("Invalid environment variables");
  }
}

/**
 * Validated environment variables
 */
export const env = validateEnv();

/**
 * Type definition for the env object
 */
export type Env = z.infer<typeof envSchema>;
