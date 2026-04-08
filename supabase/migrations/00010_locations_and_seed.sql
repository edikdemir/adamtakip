-- Mahal (location) catalog: project-scoped list of valid mahal names
-- Note: tasks.location stays as VARCHAR for backwards compatibility.
-- This catalog only defines "valid mahal names per project"; in-use checks
-- happen via text matching (tasks.project_id + tasks.location).

CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_locations_project_id ON locations(project_id);

-- Speeds up "is mahal in use?" lookups during delete
CREATE INDEX IF NOT EXISTS idx_tasks_project_location ON tasks(project_id, location);

-- NB1105 seed: 14 zones + 14 mahaller (idempotent)
DO $$
DECLARE
  proj_id UUID;
BEGIN
  SELECT id INTO proj_id FROM projects WHERE code = 'NB1105';
  IF proj_id IS NULL THEN
    RAISE NOTICE 'NB1105 projesi bulunamadı, seed atlandı';
    RETURN;
  END IF;

  INSERT INTO zones (project_id, name) VALUES
    (proj_id, 'Zone-1'),
    (proj_id, 'Zone-2'),
    (proj_id, 'Zone-3'),
    (proj_id, 'Zone-4'),
    (proj_id, 'Zone-5'),
    (proj_id, 'Zone-6'),
    (proj_id, 'Zone-7'),
    (proj_id, 'Zone-8'),
    (proj_id, 'Zone-9'),
    (proj_id, 'Zone-10'),
    (proj_id, 'Zone-11'),
    (proj_id, 'Zone-12'),
    (proj_id, 'Zone-13'),
    (proj_id, 'Zone-14')
  ON CONFLICT (project_id, name) DO NOTHING;

  INSERT INTO locations (project_id, name) VALUES
    (proj_id, 'Engine Room'),
    (proj_id, 'MeOH High Pressure Pump Room'),
    (proj_id, 'Air Lock'),
    (proj_id, 'Dredge Pump Motor Room'),
    (proj_id, 'Jet Pump Motor Room'),
    (proj_id, 'Hoisting Area'),
    (proj_id, 'Thruster Room'),
    (proj_id, 'Electrical Workshop and Store'),
    (proj_id, 'Trafo Room PS Mid'),
    (proj_id, 'Pump Room'),
    (proj_id, 'MeOH Preperation Room'),
    (proj_id, 'AC Room'),
    (proj_id, 'Technical Space'),
    (proj_id, 'Gymnasium')
  ON CONFLICT (project_id, name) DO NOTHING;
END $$;
