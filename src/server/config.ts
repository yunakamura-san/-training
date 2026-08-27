import { z } from "zod";

const ConfigSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must use PostgreSQL",
    ),
  SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
  SLACK_APP_TOKEN: z.string().startsWith("xapp-"),
  SLACK_SIGNING_SECRET: z.string().min(16),
  SLACK_USER_ID: z.string().regex(/^U[A-Z0-9]+$/),
  SLACK_CHANNEL_ID: z.string().regex(/^[CDG][A-Z0-9]+$/),
  OLLAMA_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).max(100).default("gemma3"),
  DASHBOARD_URL: z.string().url().default("http://127.0.0.1:43127"),
  ALLOW_MOCK_AI: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(45_000),
  LOG_LEVEL: z.enum(["error", "warn", "info"]).default("info"),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(env);
}

export function safeLog(
  level: "error" | "warn" | "info",
  message: string,
  metadata: Record<string, string | number | boolean> = {},
): void {
  const clean = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) => !/token|secret|password|authorization|database_url/i.test(key),
    ),
  );
  const line = JSON.stringify({ level, message, ...clean, at: new Date().toISOString() });
  (level === "error" ? console.error : console.log)(line);
}
