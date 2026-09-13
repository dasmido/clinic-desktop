CREATE TYPE visit_status AS ENUM (
  'scheduled',
  'arrived',
  'completed',
  'cancelled'
);

ALTER TABLE patient_medical_records
  ADD COLUMN status visit_status;

UPDATE patient_medical_records
SET status = 'completed';

ALTER TABLE patient_medical_records
  ALTER COLUMN status SET DEFAULT 'scheduled',
  ALTER COLUMN status SET NOT NULL;