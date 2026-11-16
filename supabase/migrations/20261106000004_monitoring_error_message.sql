-- Add error_message column to monitoring_records
-- Required by monitoring.repository.ts which stores health check failure reasons.

alter table public.monitoring_records
  add column if not exists error_message text;
