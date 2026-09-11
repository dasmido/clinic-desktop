CREATE TABLE patient_clinical_alerts (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  related_medical_record_id INTEGER REFERENCES patient_medical_records(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('allergy', 'contraindication', 'critical_value', 'follow_up_due')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  dismissible BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX patient_clinical_alerts_patient_active_idx ON patient_clinical_alerts (patient_id, is_active, created_at DESC);