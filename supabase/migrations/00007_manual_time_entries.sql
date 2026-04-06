-- Manual time entries: workers log offline work time with a reason
CREATE TABLE IF NOT EXISTS manual_time_entries (
  id         BIGSERIAL PRIMARY KEY,
  task_id    BIGINT    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID      NOT NULL REFERENCES users(id),
  hours      DOUBLE PRECISION NOT NULL CHECK (hours > 0),
  reason     TEXT      NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_time_entries_task_id_idx ON manual_time_entries(task_id);
CREATE INDEX IF NOT EXISTS manual_time_entries_user_id_idx ON manual_time_entries(user_id);

-- Atomically increment manual_hours on a task
CREATE OR REPLACE FUNCTION increment_manual_hours(p_task_id BIGINT, p_hours DOUBLE PRECISION)
RETURNS void LANGUAGE sql AS $$
  UPDATE tasks
  SET manual_hours = COALESCE(manual_hours, 0) + p_hours,
      updated_at   = now()
  WHERE id = p_task_id;
$$;
