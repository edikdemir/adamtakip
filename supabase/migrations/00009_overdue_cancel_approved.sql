-- 1) admin_status'a 'iptal' ekle
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_admin_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_admin_status_check
  CHECK (admin_status IN ('havuzda', 'atandi', 'devam_ediyor', 'tamamlandi', 'onaylandi', 'iptal'));

-- 2) Adminin onayladığı tarih + kim onayladı
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- 3) Gecikme bildirimi tekrar göndermemek için son bildirim tarihi
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS overdue_notified_at DATE;

-- 4) email_notifications'a yeni anahtarlar
UPDATE system_settings
SET value = jsonb_set(
  jsonb_set(value, '{overdue_notify_user}', 'true'::jsonb, true),
  '{overdue_notify_admin}', 'true'::jsonb, true
)
WHERE key = 'email_notifications';
