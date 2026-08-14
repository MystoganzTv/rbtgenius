CREATE TABLE IF NOT EXISTS apple_analytics_rows (
  report_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  dimension_hash TEXT NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  processing_date DATE NOT NULL,
  source_instance_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (report_name, event_date, dimension_hash)
);

CREATE INDEX IF NOT EXISTS idx_apple_analytics_rows_event_date
  ON apple_analytics_rows(event_date DESC);

CREATE TABLE IF NOT EXISTS apple_analytics_imports (
  instance_id TEXT PRIMARY KEY,
  report_name TEXT NOT NULL,
  processing_date DATE NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apple_analytics_imports_processing_date
  ON apple_analytics_imports(processing_date DESC);

