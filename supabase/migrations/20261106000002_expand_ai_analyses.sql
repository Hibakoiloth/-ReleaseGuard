ALTER TABLE public.ai_analyses ALTER COLUMN summary DROP NOT NULL;

ALTER TABLE public.ai_analyses
  ADD COLUMN IF NOT EXISTS model_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS confidence float,
  ADD COLUMN IF NOT EXISTS evidence jsonb,
  ADD COLUMN IF NOT EXISTS impact text,
  ADD COLUMN IF NOT EXISTS recommended_actions jsonb,
  ADD COLUMN IF NOT EXISTS rollback_recommended boolean,
  ADD COLUMN IF NOT EXISTS rollback_reason text,
  ADD COLUMN IF NOT EXISTS missing_information jsonb,
  ADD COLUMN IF NOT EXISTS processing_duration_ms integer,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
