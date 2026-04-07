-- Remove koordinator role: promote existing koordinators to super_admin
-- and tighten the CHECK constraint to only allow ('user', 'super_admin').

UPDATE users SET role = 'super_admin' WHERE role = 'koordinator';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'super_admin'));
