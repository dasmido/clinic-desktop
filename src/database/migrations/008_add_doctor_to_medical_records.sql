ALTER TABLE patient_medical_records
  ADD COLUMN doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL;

CREATE INDEX patient_medical_records_doctor_idx ON patient_medical_records (doctor_id);