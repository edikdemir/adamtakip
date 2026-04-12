-- Track lightweight user presence for admin user cards.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
  ON users(last_seen_at)
  WHERE last_seen_at IS NOT NULL;

-- Presence heartbeats should not make profile metadata look recently edited.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'users'
     AND (to_jsonb(NEW) - 'last_seen_at' - 'updated_at') = (to_jsonb(OLD) - 'last_seen_at' - 'updated_at') THEN
    NEW.updated_at = OLD.updated_at;
    RETURN NEW;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
