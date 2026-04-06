-- Task linking: a "primary" task can have multiple "dependent" tasks that
-- share the same physical drawing/work but remain independent for status
-- and time tracking. Single-level only (no nesting).

ALTER TABLE tasks
  ADD COLUMN linked_to_task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_linked_to ON tasks(linked_to_task_id)
  WHERE linked_to_task_id IS NOT NULL;

-- Enforce single-level linking and prevent self/cycle links.
CREATE OR REPLACE FUNCTION enforce_single_level_task_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linked_to_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.linked_to_task_id = NEW.id THEN
    RAISE EXCEPTION 'Bir görev kendisine linklenemez';
  END IF;

  -- Hedef görev kendisi başka bir göreve linkli olmamalı
  IF EXISTS (
    SELECT 1 FROM tasks
    WHERE id = NEW.linked_to_task_id
      AND linked_to_task_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Bağımlı bir göreve link verilemez (tek seviye)';
  END IF;

  -- Bu görev başkalarının primary'si ise bağımlı yapılamaz
  IF EXISTS (
    SELECT 1 FROM tasks WHERE linked_to_task_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Bu görev zaten primary; önce bağımlılarını ayır';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_level_task_link
  BEFORE INSERT OR UPDATE OF linked_to_task_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION enforce_single_level_task_link();
