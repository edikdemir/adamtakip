-- Move task list filtering/sorting/pagination to PostgreSQL so /api/tasks does
-- not need to fetch the whole task table before slicing.

CREATE OR REPLACE FUNCTION task_deadline_state(p_planned_end DATE)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN p_planned_end IS NULL THEN 'none'
    WHEN p_planned_end < CURRENT_DATE THEN 'overdue'
    WHEN p_planned_end <= CURRENT_DATE + 3 THEN 'warning'
    ELSE 'ok'
  END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION task_duration_seconds(t tasks)
RETURNS DOUBLE PRECISION AS $$
  SELECT
    COALESCE(t.total_elapsed_seconds, 0) +
    CASE
      WHEN t.timer_started_at IS NOT NULL THEN GREATEST(EXTRACT(EPOCH FROM (now() - t.timer_started_at)), 0)
      ELSE 0
    END +
    (COALESCE(t.manual_hours, 0) * 3600);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION list_tasks(
  p_requesting_user_id UUID,
  p_is_super_admin BOOLEAN DEFAULT false,
  p_my_tasks BOOLEAN DEFAULT false,
  p_status TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_job_type_id UUID DEFAULT NULL,
  p_job_sub_type_id UUID DEFAULT NULL,
  p_zone_id UUID DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_assignment_state TEXT DEFAULT NULL,
  p_timer_state TEXT DEFAULT NULL,
  p_link_state TEXT DEFAULT NULL,
  p_deadline_state TEXT DEFAULT NULL,
  p_planned_start_from DATE DEFAULT NULL,
  p_planned_start_to DATE DEFAULT NULL,
  p_planned_end_from DATE DEFAULT NULL,
  p_planned_end_to DATE DEFAULT NULL,
  p_sort TEXT DEFAULT 'created_desc',
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT NULL,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  project_id UUID,
  job_type_id UUID,
  job_sub_type_id UUID,
  zone_id UUID,
  location TEXT,
  drawing_no TEXT,
  description TEXT,
  planned_start DATE,
  planned_end DATE,
  assigned_to UUID,
  assigned_by UUID,
  total_elapsed_seconds DOUBLE PRECISION,
  timer_started_at TIMESTAMPTZ,
  manual_hours DOUBLE PRECISION,
  worker_status TEXT,
  admin_status TEXT,
  completion_date DATE,
  admin_notes TEXT,
  priority TEXT,
  linked_to_task_id BIGINT,
  approved_at DATE,
  approved_by UUID,
  overdue_notified_at DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  project_code TEXT,
  project_name TEXT,
  project_is_archived BOOLEAN,
  project_created_at TIMESTAMPTZ,
  job_type_name TEXT,
  job_sub_type_name TEXT,
  zone_name TEXT,
  assigned_user_id UUID,
  assigned_user_display_name TEXT,
  assigned_user_email TEXT,
  assigned_user_photo_url TEXT,
  assigned_by_user_id UUID,
  assigned_by_user_display_name TEXT,
  assigned_by_user_email TEXT,
  assigned_by_user_photo_url TEXT,
  approved_by_user_id UUID,
  approved_by_user_display_name TEXT,
  approved_by_user_email TEXT,
  approved_by_user_photo_url TEXT,
  has_links BOOLEAN,
  deadline_state TEXT,
  duration_seconds DOUBLE PRECISION,
  total_count BIGINT
) AS $$
WITH params AS (
  SELECT
    CASE
      WHEN NULLIF(BTRIM(p_search), '') IS NULL THEN NULL
      ELSE '%' ||
        REPLACE(
          REPLACE(
            REPLACE(BTRIM(p_search), E'\\', E'\\\\'),
            '%',
            E'\\%'
          ),
          '_',
          E'\\_'
        ) ||
        '%'
    END AS search_pattern
),
filtered AS (
  SELECT
    t.*,
    p.code AS project_code,
    p.name AS project_name,
    p.is_archived AS project_is_archived,
    p.created_at AS project_created_at,
    jt.name AS job_type_name,
    jst.name AS job_sub_type_name,
    z.name AS zone_name,
    au.id AS assigned_user_id,
    au.display_name AS assigned_user_display_name,
    au.email AS assigned_user_email,
    au.photo_url AS assigned_user_photo_url,
    abu.id AS assigned_by_user_id,
    abu.display_name AS assigned_by_user_display_name,
    abu.email AS assigned_by_user_email,
    abu.photo_url AS assigned_by_user_photo_url,
    apu.id AS approved_by_user_id,
    apu.display_name AS approved_by_user_display_name,
    apu.email AS approved_by_user_email,
    apu.photo_url AS approved_by_user_photo_url,
    (
      t.linked_to_task_id IS NOT NULL OR
      EXISTS (SELECT 1 FROM tasks child WHERE child.linked_to_task_id = t.id)
    ) AS has_links,
    task_deadline_state(t.planned_end) AS deadline_state,
    task_duration_seconds(t) AS duration_seconds
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN job_types jt ON jt.id = t.job_type_id
  JOIN job_sub_types jst ON jst.id = t.job_sub_type_id
  LEFT JOIN zones z ON z.id = t.zone_id
  LEFT JOIN users au ON au.id = t.assigned_to
  LEFT JOIN users abu ON abu.id = t.assigned_by
  LEFT JOIN users apu ON apu.id = t.approved_by
  CROSS JOIN params prm
  WHERE
    (
      (p_is_super_admin AND NOT p_my_tasks)
      OR t.assigned_to = p_requesting_user_id
    )
    AND (
      NOT (p_is_super_admin AND NOT p_my_tasks)
      OR p_assigned_to IS NULL
      OR t.assigned_to = p_assigned_to
    )
    AND (p_status IS NULL OR p_status = 'all'
      OR (p_status = 'active_work' AND t.admin_status IN ('atandi', 'devam_ediyor'))
      OR (p_status = 'assignable' AND t.admin_status IN ('havuzda', 'atandi'))
      OR t.admin_status = p_status)
    AND (p_project_id IS NULL OR t.project_id = p_project_id)
    AND (p_job_type_id IS NULL OR t.job_type_id = p_job_type_id)
    AND (p_job_sub_type_id IS NULL OR t.job_sub_type_id = p_job_sub_type_id)
    AND (p_zone_id IS NULL OR t.zone_id = p_zone_id)
    AND (p_location IS NULL OR t.location = p_location)
    AND (p_priority IS NULL OR t.priority = p_priority)
    AND (p_planned_start_from IS NULL OR t.planned_start >= p_planned_start_from)
    AND (p_planned_start_to IS NULL OR t.planned_start <= p_planned_start_to)
    AND (p_planned_end_from IS NULL OR t.planned_end >= p_planned_end_from)
    AND (p_planned_end_to IS NULL OR t.planned_end <= p_planned_end_to)
    AND (p_assignment_state IS NULL OR p_assignment_state = 'all'
      OR (p_assignment_state = 'assigned' AND t.assigned_to IS NOT NULL)
      OR (p_assignment_state = 'unassigned' AND t.assigned_to IS NULL))
    AND (p_timer_state IS NULL OR p_timer_state = 'all'
      OR (p_timer_state = 'running' AND t.timer_started_at IS NOT NULL)
      OR (p_timer_state = 'stopped' AND t.timer_started_at IS NULL))
    AND (p_link_state IS NULL OR p_link_state = 'all'
      OR (p_link_state = 'linked' AND (
        t.linked_to_task_id IS NOT NULL OR EXISTS (SELECT 1 FROM tasks child WHERE child.linked_to_task_id = t.id)
      ))
      OR (p_link_state = 'unlinked' AND t.linked_to_task_id IS NULL AND NOT EXISTS (
        SELECT 1 FROM tasks child WHERE child.linked_to_task_id = t.id
      )))
    AND (p_deadline_state IS NULL OR p_deadline_state = 'all' OR task_deadline_state(t.planned_end) = p_deadline_state)
    AND (
      prm.search_pattern IS NULL
      OR t.drawing_no ILIKE prm.search_pattern ESCAPE E'\\'
      OR t.description ILIKE prm.search_pattern ESCAPE E'\\'
      OR COALESCE(t.location, '') ILIKE prm.search_pattern ESCAPE E'\\'
      OR p.code ILIKE prm.search_pattern ESCAPE E'\\'
      OR COALESCE(p.name, '') ILIKE prm.search_pattern ESCAPE E'\\'
      OR COALESCE(z.name, '') ILIKE prm.search_pattern ESCAPE E'\\'
      OR COALESCE(au.display_name, '') ILIKE prm.search_pattern ESCAPE E'\\'
    )
)
SELECT
  f.id,
  f.project_id,
  f.job_type_id,
  f.job_sub_type_id,
  f.zone_id,
  f.location::TEXT,
  f.drawing_no::TEXT,
  f.description::TEXT,
  f.planned_start,
  f.planned_end,
  f.assigned_to,
  f.assigned_by,
  f.total_elapsed_seconds,
  f.timer_started_at,
  f.manual_hours,
  f.worker_status::TEXT,
  f.admin_status::TEXT,
  f.completion_date,
  f.admin_notes,
  f.priority::TEXT,
  f.linked_to_task_id,
  f.approved_at,
  f.approved_by,
  f.overdue_notified_at,
  f.created_at,
  f.updated_at,
  f.project_code::TEXT,
  f.project_name::TEXT,
  f.project_is_archived,
  f.project_created_at,
  f.job_type_name::TEXT,
  f.job_sub_type_name::TEXT,
  f.zone_name::TEXT,
  f.assigned_user_id,
  f.assigned_user_display_name::TEXT,
  f.assigned_user_email::TEXT,
  f.assigned_user_photo_url::TEXT,
  f.assigned_by_user_id,
  f.assigned_by_user_display_name::TEXT,
  f.assigned_by_user_email::TEXT,
  f.assigned_by_user_photo_url::TEXT,
  f.approved_by_user_id,
  f.approved_by_user_display_name::TEXT,
  f.approved_by_user_email::TEXT,
  f.approved_by_user_photo_url::TEXT,
  f.has_links,
  f.deadline_state,
  f.duration_seconds,
  COUNT(*) OVER() AS total_count
FROM filtered f
ORDER BY
  CASE WHEN p_sort = 'deadline_asc' THEN f.planned_end END ASC NULLS LAST,
  CASE WHEN p_sort = 'deadline_desc' THEN f.planned_end END DESC NULLS LAST,
  CASE WHEN p_sort = 'priority_desc' THEN
    CASE f.priority
      WHEN 'urgent' THEN 4
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
      ELSE 0
    END
  END DESC,
  CASE WHEN p_sort = 'duration_desc' THEN f.duration_seconds END DESC NULLS LAST,
  CASE WHEN p_sort = 'drawing_asc' THEN f.drawing_no END ASC,
  f.created_at DESC,
  f.id DESC
LIMIT CASE WHEN p_limit IS NULL THEN NULL ELSE GREATEST(p_limit, 0) END
OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION task_summary(
  p_requesting_user_id UUID,
  p_is_super_admin BOOLEAN DEFAULT false,
  p_my_tasks BOOLEAN DEFAULT false,
  p_status TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_job_type_id UUID DEFAULT NULL,
  p_job_sub_type_id UUID DEFAULT NULL,
  p_zone_id UUID DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_assignment_state TEXT DEFAULT NULL,
  p_timer_state TEXT DEFAULT NULL,
  p_link_state TEXT DEFAULT NULL,
  p_deadline_state TEXT DEFAULT NULL,
  p_planned_start_from DATE DEFAULT NULL,
  p_planned_start_to DATE DEFAULT NULL,
  p_planned_end_from DATE DEFAULT NULL,
  p_planned_end_to DATE DEFAULT NULL,
  p_sort TEXT DEFAULT 'created_desc',
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT NULL,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  total_count BIGINT,
  by_status JSONB,
  active_timer_count BIGINT,
  overdue_count BIGINT,
  updated_today_count BIGINT,
  total_duration_seconds DOUBLE PRECISION
) AS $$
WITH rows AS (
  SELECT *
  FROM list_tasks(
    p_requesting_user_id,
    p_is_super_admin,
    p_my_tasks,
    p_status,
    p_project_id,
    p_assigned_to,
    p_job_type_id,
    p_job_sub_type_id,
    p_zone_id,
    p_location,
    p_priority,
    p_assignment_state,
    p_timer_state,
    p_link_state,
    p_deadline_state,
    p_planned_start_from,
    p_planned_start_to,
    p_planned_end_from,
    p_planned_end_to,
    p_sort,
    p_search,
    NULL,
    0
  )
),
status_counts AS (
  SELECT admin_status, COUNT(*) AS count
  FROM rows
  GROUP BY admin_status
)
SELECT
  (SELECT COUNT(*) FROM rows) AS total_count,
  COALESCE((SELECT jsonb_object_agg(admin_status, count) FROM status_counts), '{}'::jsonb) AS by_status,
  (SELECT COUNT(*) FROM rows WHERE timer_started_at IS NOT NULL) AS active_timer_count,
  (SELECT COUNT(*) FROM rows WHERE deadline_state = 'overdue') AS overdue_count,
  (SELECT COUNT(*) FROM rows WHERE updated_at::DATE = CURRENT_DATE) AS updated_today_count,
  COALESCE((SELECT SUM(duration_seconds) FROM rows), 0) AS total_duration_seconds;
$$ LANGUAGE SQL STABLE;

CREATE INDEX IF NOT EXISTS idx_tasks_job_type_id ON tasks(job_type_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_sub_type_id ON tasks(job_sub_type_id);
CREATE INDEX IF NOT EXISTS idx_tasks_zone_id ON tasks(zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(admin_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, admin_status);
