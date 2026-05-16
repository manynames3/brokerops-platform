CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_policy_id TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  carrier_id UUID NOT NULL REFERENCES carriers(id),
  expected_commission_rate NUMERIC(5,4) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS statement_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS statement_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_file_id UUID NOT NULL REFERENCES statement_files(id),
  external_policy_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  payment_date DATE NOT NULL,
  premium_cents INTEGER NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  commission_amount_cents INTEGER NOT NULL,
  source_row_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  statement_row_id UUID NOT NULL REFERENCES statement_rows(id),
  policy_id UUID REFERENCES policies(id),
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  expected_amount_cents INTEGER,
  actual_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES reconciliation_exceptions(id),
  provider TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  summary TEXT NOT NULL,
  likely_cause TEXT NOT NULL,
  recommended_next_step TEXT NOT NULL,
  evidence_ids TEXT[] NOT NULL DEFAULT '{}',
  confidence TEXT NOT NULL,
  missing_information TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statement_rows_external_policy_id ON statement_rows(external_policy_id);
CREATE INDEX IF NOT EXISTS idx_statement_rows_statement_file_id ON statement_rows(statement_file_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status_created ON reconciliation_exceptions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_exception_id ON ai_reviews(exception_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
