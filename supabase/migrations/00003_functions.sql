-- Get effective elapsed hours for a task (including running timer)
CREATE OR REPLACE FUNCTION get_task_elapsed_hours(t tasks)
RETURNS DOUBLE PRECISION AS $$
  SELECT (t.total_elapsed_seconds +
    CASE WHEN t.timer_started_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (now() - t.timer_started_at))
      ELSE 0
    END) / 3600.0;
$$ LANGUAGE SQL STABLE;

-- Get tasks due within N days (for deadline warning cron)
CREATE OR REPLACE FUNCTION get_tasks_due_soon(days_ahead INTEGER DEFAULT 2)
RETURNS TABLE(task_id BIGINT, user_id UUID, planned_end DATE, drawing_no VARCHAR, project_code VARCHAR) AS $$
  SELECT
    t.id,
    t.assigned_to,
    t.planned_end,
    t.drawing_no,
    p.code
  FROM tasks t
  JOIN projects p ON t.project_id = p.id
  WHERE
    t.assigned_to IS NOT NULL
    AND t.planned_end IS NOT NULL
    AND t.admin_status NOT IN ('tamamlandi', 'onaylandi')
    AND t.planned_end = CURRENT_DATE + days_ahead
$$ LANGUAGE SQL STABLE;
