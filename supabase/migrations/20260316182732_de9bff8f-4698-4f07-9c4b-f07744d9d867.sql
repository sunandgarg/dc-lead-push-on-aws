
ALTER TABLE upload_batches ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;
ALTER TABLE upload_batches ADD COLUMN IF NOT EXISTS leads_per_minute integer DEFAULT 5;
ALTER TABLE upload_batches ADD COLUMN IF NOT EXISTS api_config jsonb DEFAULT NULL;
