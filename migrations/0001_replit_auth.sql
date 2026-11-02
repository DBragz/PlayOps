-- Non-destructive upgrade for Replit Auth. Existing user rows, play owners,
-- Stripe identifiers, and subscription fields remain unchanged.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subject text;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_provider_subject_unique
  ON users (auth_provider, provider_subject);

CREATE TABLE IF NOT EXISTS sessions (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions (expire);
