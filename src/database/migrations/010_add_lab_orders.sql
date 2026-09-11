CREATE TABLE lab_orders (
  id SERIAL PRIMARY KEY,
  medical_record_id INTEGER NOT NULL REFERENCES patient_medical_records(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  ordered_by_user_id INTEGER NOT NULL REFERENCES users(id),
  test_name TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent')),
  clinical_indication TEXT NOT NULL DEFAULT '',
  result_status TEXT NOT NULL DEFAULT 'pending' CHECK (result_status IN ('pending', 'resulted', 'cancelled')),
  ordered_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lab_results (
  id SERIAL PRIMARY KEY,
  lab_order_id INTEGER NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  result_value TEXT NOT NULL,
  reference_range TEXT NOT NULL DEFAULT '',
  interpretation TEXT NOT NULL DEFAULT '' CHECK (interpretation IN ('', 'normal', 'low', 'high', 'critical')),
  notes TEXT NOT NULL DEFAULT '',
  recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
  recorded_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lab_orders_patient_ordered_idx ON lab_orders (patient_id, ordered_on DESC);
CREATE INDEX lab_orders_status_ordered_idx ON lab_orders (result_status, ordered_on ASC);
CREATE INDEX lab_orders_record_idx ON lab_orders (medical_record_id);
CREATE INDEX lab_results_order_idx ON lab_results (lab_order_id);