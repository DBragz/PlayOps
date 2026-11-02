import { Pool } from "pg";

async function migrate(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to apply the authentication schema upgrade.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ users_table: string | null }>(
      "SELECT to_regclass('public.users')::text AS users_table",
    );
    if (!result.rows[0]?.users_table) {
      throw new Error("The existing users table was not found; apply the PlayOps schema first.");
    }

    await client.query("ALTER TABLE users ALTER COLUMN password DROP NOT NULL");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider text");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subject text");
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_auth_provider_subject_unique ON users (auth_provider, provider_subject)",
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid varchar NOT NULL PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
    `);
    await client.query(
      "CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions (expire)",
    );
    await client.query("COMMIT");
    console.log("Authentication schema is ready. Existing user and play data were preserved.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error("Authentication schema upgrade failed:", error);
  process.exitCode = 1;
});
