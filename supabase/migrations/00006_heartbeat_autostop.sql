-- Heartbeat column: tracks last time client confirmed timer is still active
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Function: stop timers whose last heartbeat is older than 30 minutes
-- Called by pg_cron every 5 minutes
CREATE OR REPLACE FUNCTION stop_stale_timers()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  stale RECORD;
  additional DOUBLE PRECISION;
  new_total DOUBLE PRECISION;
BEGIN
  FOR stale IN
    SELECT id, timer_started_at, total_elapsed_seconds, assigned_to
    FROM tasks
    WHERE timer_started_at IS NOT NULL
      AND last_heartbeat_at IS NOT NULL
      AND last_heartbeat_at < now() - interval '30 minutes'
  LOOP
    additional := EXTRACT(EPOCH FROM (now() - stale.timer_started_at));
    new_total := stale.total_elapsed_seconds + GREATEST(additional, 0);

    UPDATE tasks SET
      total_elapsed_seconds = new_total,
      timer_started_at      = NULL,
      last_heartbeat_at     = NULL,
      updated_at            = now()
    WHERE id = stale.id;

    INSERT INTO timer_logs (task_id, user_id, action, elapsed_at_action)
    VALUES (stale.id, stale.assigned_to, 'auto_stop', new_total);
  END LOOP;
END;
$$;

-- pg_cron: run stop_stale_timers every 5 minutes
-- NOTE: pg_cron extension must be enabled in Supabase Dashboard first.
-- Run this block in Supabase SQL Editor (requires superuser):
--   SELECT cron.schedule(
--     'stop-stale-timers',
--     '*/5 * * * *',
--     $$ SELECT stop_stale_timers(); $$
--   );
