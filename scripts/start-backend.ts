import { DEMO_CASES } from "../src/core/templates";
import { FallbackAiProvider, type AiProvider } from "../src/server/ai/provider";
import { AntigravityProvider } from "../src/server/ai/antigravity-provider";
import { MockAiProvider } from "../src/server/ai/mock-provider";
import { OllamaProvider } from "../src/server/ai/ollama-provider";
import { loadConfig, safeLog } from "../src/server/config";
import {
  createPostgresClient,
  PostgresRepository,
} from "../src/server/postgres-repository";
import { TrainingScheduler } from "../src/server/scheduler";
import { createSlackRuntime } from "../src/server/slack-app";

async function main(): Promise<void> {
  const config = loadConfig();
  const sql = createPostgresClient(config.DATABASE_URL);
  const repository = new PostgresRepository(sql);
  for (const trainingCase of DEMO_CASES) {
    await repository.upsertCase(trainingCase);
  }

  const providers: AiProvider[] = [
    new AntigravityProvider(config.ANTIGRAVITY_EXECUTABLE, config.AI_TIMEOUT_MS),
    new OllamaProvider(config.OLLAMA_URL, config.OLLAMA_MODEL, config.AI_TIMEOUT_MS),
  ];
  if (config.ALLOW_MOCK_AI) providers.push(new MockAiProvider());
  const ai = new FallbackAiProvider(providers);
  const runtime = createSlackRuntime(config, repository, ai);
  const scheduler = new TrainingScheduler(
    repository,
    runtime.messenger,
    config.SLACK_USER_ID,
  );

  await runtime.app.start();
  scheduler.start();
  safeLog("info", "Thinktrain backend started");

  let stopping = false;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    safeLog("info", "Stopping Thinktrain backend", { signal });
    scheduler.stop();
    await runtime.app.stop();
    await sql.end({ timeout: 5 });
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

main().catch((error: unknown) => {
  safeLog("error", "Thinktrain backend failed to start", {
    errorType: error instanceof Error ? error.name : "unknown",
  });
  process.exitCode = 1;
});
