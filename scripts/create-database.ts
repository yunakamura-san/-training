import postgres from "postgres";

async function main(): Promise<void> {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required");
  const target = new URL(raw);
  const databaseName = decodeURIComponent(target.pathname.slice(1));
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(databaseName)) {
    throw new Error("Database name must match ^[a-z][a-z0-9_]{0,62}$");
  }
  target.pathname = "/postgres";
  const sql = postgres(target.toString(), { max: 1, connect_timeout: 10 });
  try {
    const exists = await sql`
      SELECT 1 FROM pg_database WHERE datname = ${databaseName} LIMIT 1
    `;
    if (exists.length === 0) {
      await sql`CREATE DATABASE ${sql(databaseName)}`;
      console.log(`Created database ${databaseName}`);
    } else {
      console.log(`Database ${databaseName} already exists`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: "Database creation failed",
      errorType: error instanceof Error ? error.name : "unknown",
    }),
  );
  process.exitCode = 1;
});
