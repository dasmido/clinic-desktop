CREATE TABLE visit_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  visit_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  template_data JSONB NOT NULL DEFAULT '{"sections": []}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE visit_template_uses (
  id SERIAL PRIMARY KEY,
  medical_record_id INTEGER NOT NULL REFERENCES patient_medical_records(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES visit_templates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medical_record_id, template_id)
);

CREATE INDEX visit_templates_active_idx ON visit_templates (is_active, name);
CREATE INDEX visit_template_uses_record_idx ON visit_template_uses (medical_record_id);