import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createPostgresClient } from "../src/server/postgres-repository";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const sql = createPostgresClient(databaseUrl);
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    const directory = resolve(process.cwd(), "db/migrations");
    const files = (await readdir(directory))
      .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
      .sort();
    for (const file of files) {
      const applied = await sql`
        SELECT 1 FROM schema_migrations WHERE version = ${file} LIMIT 1
      `;
      if (applied.length > 0) continue;
      const migration = await readFile(resolve(directory, file), "utf8");
      await sql.begin(async (transaction) => {
        await transaction.unsafe(migration);
        await transaction`
          INSERT INTO schema_migrations (version) VALUES (${file})
          ON CONFLICT DO NOTHING
        `;
      });
      console.log(`Applied migration ${file}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: "Migration failed",
      errorType: error instanceof Error ? error.name : "unknown",
    }),
  );
  process.exitCode = 1;
});
