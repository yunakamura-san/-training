import { createPostgresClient } from "../src/server/postgres-repository";

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    throw new Error("Run through npm run db:reset-progress to confirm");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const sql = createPostgresClient(databaseUrl);
  try {
    await sql.unsafe(`
      TRUNCATE TABLE
        pending_benchmarks,
        benchmarks,
        evaluations,
        difficulty_history,
        difficulty_states,
        training_sessions,
        notification_claims
      RESTART IDENTITY CASCADE
    `);
    console.log("学習履歴・評価・難易度・通知履歴を初期化しました。問題ケースは保持されています。");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? `進捗の初期化に失敗しました: ${error.message}` : "進捗の初期化に失敗しました",
  );
  process.exitCode = 1;
});
