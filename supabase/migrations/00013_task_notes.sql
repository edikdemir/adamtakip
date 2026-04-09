-- Görev notları
CREATE TABLE IF NOT EXISTS task_notes (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);

-- Bildirim ayarına not gönderimi ekle
UPDATE system_settings
SET value = jsonb_set(value, '{send_on_note}', 'true'::jsonb, true)
WHERE key = 'email_notifications';
