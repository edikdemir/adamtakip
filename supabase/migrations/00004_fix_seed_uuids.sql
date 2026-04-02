-- Add missing sub-types for Yüzey İşlem job type.
-- The API-side fix (z.string().guid()) handles existing "fake" UUIDs — no DB UUID update needed.
-- This migration only adds the missing sub-types, resolved by job type name (UUID-agnostic).

INSERT INTO job_sub_types (job_type_id, name, sort_order)
SELECT jt.id, v.name, v.ord
FROM job_types jt
CROSS JOIN (VALUES
  ('Yapı Hazırlık', 1),
  ('Yüzey Temizlik', 2),
  ('Boya Uygulama', 3)
) AS v(name, ord)
WHERE jt.name = 'Yüzey İşlem'
ON CONFLICT (job_type_id, name) DO NOTHING;
