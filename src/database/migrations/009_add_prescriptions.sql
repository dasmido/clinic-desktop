CREATE TABLE prescriptions (
  id SERIAL PRIMARY KEY,
  medical_record_id INTEGER NOT NULL REFERENCES patient_medical_records(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescribed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  prescribed_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX prescriptions_patient_prescribed_idx ON prescriptions (patient_id, prescribed_on DESC);
CREATE INDEX prescriptions_record_idx ON prescriptions (medical_record_id);
CREATE INDEX prescriptions_status_idx ON prescriptions (status);