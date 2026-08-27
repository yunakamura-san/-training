BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_cases (
  id text PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 10000),
  difficulty numeric(5,2) NOT NULL CHECK (difficulty BETWEEN 0 AND 100),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnostic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  channel_id text NOT NULL,
  case_id text NOT NULL REFERENCES training_cases(id),
  status text NOT NULL CHECK (status IN ('active', 'interrupted', 'completed', 'abandoned')),
  current_step smallint NOT NULL CHECK (current_step BETWEEN 0 AND 7),
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS one_open_session_per_user
  ON training_sessions (user_id)
  WHERE status IN ('active', 'interrupted');

CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL UNIQUE REFERENCES training_sessions(id) ON DELETE CASCADE,
  categories jsonb NOT NULL,
  overall_score numeric(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  strength text NOT NULL CHECK (char_length(strength) BETWEEN 1 AND 2000),
  improvements jsonb NOT NULL,
  provider text NOT NULL,
  raw_feedback text,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS difficulty_states (
  user_id text PRIMARY KEY,
  current numeric(5,2) NOT NULL CHECK (current BETWEEN 0 AND 100),
  ability numeric(5,2) NOT NULL CHECK (ability BETWEEN 0 AND 100),
  recent_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  weak_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS difficulty_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  ability numeric(5,2) NOT NULL CHECK (ability BETWEEN 0 AND 100),
  difficulty numeric(5,2) NOT NULL CHECK (difficulty BETWEEN 0 AND 100),
  score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benchmarks (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal > 0 AND ordinal % 10 = 0),
  response text NOT NULL CHECK (char_length(response) BETWEEN 1 AND 20000),
  categories jsonb NOT NULL,
  overall_score numeric(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  strength text NOT NULL CHECK (char_length(strength) BETWEEN 1 AND 2000),
  provider text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (session_id, ordinal)
);

CREATE TABLE IF NOT EXISTS pending_benchmarks (
  user_id text PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal > 0 AND ordinal % 10 = 0),
  created_at timestamptz NOT NULL,
  UNIQUE (session_id, ordinal)
);

CREATE TABLE IF NOT EXISTS notification_claims (
  local_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('question', 'reminder')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (local_date, kind)
);

CREATE INDEX IF NOT EXISTS sessions_user_completed_idx
  ON training_sessions (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS evaluations_created_idx
  ON evaluations (created_at DESC);
CREATE INDEX IF NOT EXISTS difficulty_history_user_created_idx
  ON difficulty_history (user_id, created_at DESC);

COMMIT;
