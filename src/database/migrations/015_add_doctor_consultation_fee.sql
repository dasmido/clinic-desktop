ALTER TABLE doctors
  ADD COLUMN consultation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0);

ALTER TABLE appointments
  ADD COLUMN visit_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (visit_fee >= 0);
