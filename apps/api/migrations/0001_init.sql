-- Personal: initial schema. Applied by scripts/migrate.ts as the database owner.
-- The app connects as personal_app, which does not own these tables, so row-level
-- security always applies to it.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'personal_app') THEN
    CREATE ROLE personal_app NOLOGIN;
  END IF;
END $$;

-- Better Auth ---------------------------------------------------------------
CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_id_idx ON session(user_id);

CREATE TABLE account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_user_id_idx ON account(user_id);

CREATE TABLE verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

CREATE TABLE rate_limit (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE,
  count integer NOT NULL,
  last_request bigint NOT NULL
);

-- Sync -------------------------------------------------------------------------
CREATE TABLE records (
  user_id text NOT NULL,
  tbl text NOT NULL,
  id uuid NOT NULL,
  data jsonb NOT NULL,
  field_hlc jsonb NOT NULL,
  server_version bigint NOT NULL,
  PRIMARY KEY (user_id, tbl, id)
);
CREATE INDEX records_pull_idx ON records(user_id, server_version);

CREATE TABLE doc_updates (
  user_id text NOT NULL,
  id uuid NOT NULL,
  note_id uuid NOT NULL,
  data bytea NOT NULL,
  server_version bigint NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX doc_updates_pull_idx ON doc_updates(user_id, server_version);
CREATE INDEX doc_updates_note_idx ON doc_updates(user_id, note_id, server_version);

CREATE TABLE mutations (
  user_id text NOT NULL,
  id uuid NOT NULL,
  device_id text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE user_sync_state (
  user_id text PRIMARY KEY,
  server_version bigint NOT NULL DEFAULT 0
);

-- Row-level security ---------------------------------------------------------------
-- app.user_id is set per transaction with set_config('app.user_id', $1, true).
-- current_setting(..., true) returns NULL when unset, so a missing setting matches nothing.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['records', 'doc_updates', 'mutations', 'user_sync_state'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (user_id = current_setting(''app.user_id'', true)) WITH CHECK (user_id = current_setting(''app.user_id'', true))',
      t || '_owner', t
    );
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO personal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, verification, rate_limit TO personal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON records, doc_updates, mutations, user_sync_state TO personal_app;
