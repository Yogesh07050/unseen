-- 0003_users.sql — accounts: users, sessions, and account ownership of user data.
--
-- A person signs in with a username and password (routers/auth.py). Passwords
-- are stored only as scrypt hashes (services/auth.py); the bearer token the app
-- holds is stored only as its SHA-256 (sessions.token_hash). Signing in on an
-- install links it to the account and claims the anonymous history that install
-- recorded before, so the per-install tables from 0002 become account-owned:
-- every user_* row gains account_id, unique per (account_id, id). Sync for a
-- signed-in app is keyed by account_id; install_id records the last writer.

CREATE TABLE IF NOT EXISTS users (
    id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    username       text         NOT NULL,
    password_hash  text         NOT NULL,                      -- 'scrypt$<logN>$<r>$<p>$<salt b64>$<hash b64>'
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    last_login_at  timestamptz,
    CONSTRAINT users_username_unique UNIQUE (username),
    CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9][a-z0-9_.]{2,31}$'),
    CONSTRAINT users_password_hash_format CHECK (password_hash ~ '^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$')
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash    text         PRIMARY KEY,                    -- sha256 hex of the bearer token (never the token)
    user_id       uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    install_id    uuid         REFERENCES installs(install_id) ON DELETE SET NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    last_seen_at  timestamptz  NOT NULL DEFAULT now(),
    expires_at    timestamptz  NOT NULL,
    revoked_at    timestamptz,
    CONSTRAINT sessions_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT sessions_expiry_after_create CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

ALTER TABLE installs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS installs_user_idx ON installs (user_id) WHERE user_id IS NOT NULL;

-- Account ownership of the per-install data (0002). NULL = anonymous (pre-login) rows.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_account_uniq ON user_profiles (account_id) WHERE account_id IS NOT NULL;

ALTER TABLE user_battles ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS user_battles_account_id_uniq ON user_battles (account_id, id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_battles_account_updated_idx ON user_battles (account_id, updated_at) WHERE account_id IS NOT NULL;

ALTER TABLE user_stones ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS user_stones_account_id_uniq ON user_stones (account_id, id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_stones_account_updated_idx ON user_stones (account_id, updated_at) WHERE account_id IS NOT NULL;

ALTER TABLE user_allies ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS user_allies_account_id_uniq ON user_allies (account_id, id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_allies_account_updated_idx ON user_allies (account_id, updated_at) WHERE account_id IS NOT NULL;

ALTER TABLE user_armory ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS user_armory_account_id_uniq ON user_armory (account_id, id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_armory_account_updated_idx ON user_armory (account_id, updated_at) WHERE account_id IS NOT NULL;

ALTER TABLE user_watch ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS user_watch_account_id_uniq ON user_watch (account_id, id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_watch_account_updated_idx ON user_watch (account_id, updated_at) WHERE account_id IS NOT NULL;
