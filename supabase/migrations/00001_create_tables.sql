-- ========================
-- Adam Takip - Database Schema
-- ========================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_oid VARCHAR(36) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'koordinator', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job Types (Çelik, Techiz, Boru, Elektrik...)
CREATE TABLE IF NOT EXISTS job_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

-- Job Sub Types (Blok Model, Blok Kontrol, Blok Assembly...)
CREATE TABLE IF NOT EXISTS job_sub_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type_id UUID NOT NULL REFERENCES job_types(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(job_type_id, name)
);

-- Zones (project-scoped)
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  UNIQUE(project_id, name)
);

-- Tasks (core table - combines both Excel sheets)
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  job_type_id UUID NOT NULL REFERENCES job_types(id),
  job_sub_type_id UUID NOT NULL REFERENCES job_sub_types(id),
  zone_id UUID REFERENCES zones(id),
  location VARCHAR(100) DEFAULT 'NA',
  drawing_no VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  planned_start DATE,
  planned_end DATE,
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  -- Timer state
  total_elapsed_seconds DOUBLE PRECISION DEFAULT 0,
  timer_started_at TIMESTAMPTZ,
  -- Manual hours override
  manual_hours DOUBLE PRECISION,
  -- Status
  worker_status VARCHAR(20) DEFAULT 'hazir' CHECK (worker_status IN ('hazir', 'beklemede', 'bitti')),
  admin_status VARCHAR(20) DEFAULT 'havuzda' CHECK (admin_status IN ('havuzda', 'atandi', 'devam_ediyor', 'tamamlandi', 'onaylandi')),
  completion_date DATE,
  admin_notes TEXT,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_admin_status ON tasks(admin_status);
CREATE INDEX idx_tasks_timer_running ON tasks(timer_started_at) WHERE timer_started_at IS NOT NULL;
CREATE INDEX idx_tasks_planned_end ON tasks(planned_end) WHERE planned_end IS NOT NULL;

-- Timer audit log
CREATE TABLE IF NOT EXISTS timer_logs (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(10) NOT NULL CHECK (action IN ('start', 'stop', 'reset', 'sync')),
  elapsed_at_action DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('task_assigned', 'task_approved', 'task_rejected', 'deadline_warning', 'timer_reminder', 'task_completed')),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default settings
INSERT INTO system_settings (key, value) VALUES
  ('email_notifications', '{
    "enabled": true,
    "send_on_assign": true,
    "send_on_approve": true,
    "send_on_reject": true,
    "send_on_complete": true,
    "deadline_warning_days": 2
  }'::jsonb),
  ('working_hours', '{"start": "08:00", "end": "17:00"}'::jsonb),
  ('app_name', '"Adam Takip | Cemre"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
