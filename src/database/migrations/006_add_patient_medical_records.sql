CREATE TABLE patient_medical_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by_user_id INTEGER REFERENCES users(id),
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  chief_complaint TEXT NOT NULL DEFAULT '',
  diagnosis TEXT NOT NULL DEFAULT '',
  treatment_plan TEXT NOT NULL DEFAULT '',
  clinical_notes TEXT NOT NULL DEFAULT '',
  blood_pressure TEXT NOT NULL DEFAULT '',
  temperature_celsius NUMERIC(4, 1),
  weight_kg NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_record_attachments (
  id SERIAL PRIMARY KEY,
  medical_record_id INTEGER NOT NULL REFERENCES patient_medical_records(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX patient_medical_records_patient_visit_idx ON patient_medical_records (patient_id, visit_date DESC);
CREATE INDEX patient_record_attachments_record_idx ON patient_record_attachments (medical_record_id);