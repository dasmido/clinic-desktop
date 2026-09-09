UPDATE users
SET role = 'nurse'
WHERE role = 'staff';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('doctor', 'nurse', 'lab', 'pharmacy', 'moderator', 'admin'));