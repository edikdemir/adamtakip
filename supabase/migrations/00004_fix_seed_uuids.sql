-- Fix seed job_type IDs to use RFC 4122 compliant UUIDs
-- (Zod v4 validates variant bits: 4th group must start with 8,9,a,b)
-- This migration is idempotent — safe to run multiple times.

DO $$
DECLARE
  old_ids TEXT[] := ARRAY[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  ];
  new_ids TEXT[] := ARRAY[
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  ];
  i INT;
BEGIN
  FOR i IN 1..5 LOOP
    -- Only update if old ID exists (skip if already migrated)
    IF EXISTS (SELECT 1 FROM job_types WHERE id = old_ids[i]::uuid) THEN
      -- Update sub-types foreign key first
      UPDATE job_sub_types SET job_type_id = new_ids[i]::uuid WHERE job_type_id = old_ids[i]::uuid;
      -- Update tasks foreign key
      UPDATE tasks SET job_type_id = new_ids[i]::uuid WHERE job_type_id = old_ids[i]::uuid;
      -- Update the job_type id itself
      UPDATE job_types SET id = new_ids[i]::uuid WHERE id = old_ids[i]::uuid;
    END IF;
  END LOOP;
END $$;

-- Add sub-types for Yüzey İşlem if missing
INSERT INTO job_sub_types (job_type_id, name, sort_order)
SELECT '55555555-5555-4555-8555-555555555555'::uuid, v.name, v.ord
FROM (VALUES
  ('Yapı Hazırlık', 1),
  ('Yüzey Temizlik', 2),
  ('Boya Uygulama', 3)
) AS v(name, ord)
WHERE EXISTS (SELECT 1 FROM job_types WHERE id = '55555555-5555-4555-8555-555555555555'::uuid)
ON CONFLICT (job_type_id, name) DO NOTHING;
