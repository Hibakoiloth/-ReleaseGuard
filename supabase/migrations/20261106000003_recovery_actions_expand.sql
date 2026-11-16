ALTER TABLE public.recovery_actions
  ADD COLUMN IF NOT EXISTS deployment_id uuid,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS recovery_actions_one_active_per_incident
  ON public.recovery_actions(incident_id)
  WHERE status IN ('PENDING', 'PENDING_APPROVAL', 'IN_PROGRESS');
