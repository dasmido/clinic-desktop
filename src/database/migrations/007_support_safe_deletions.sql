ALTER TABLE appointments DROP CONSTRAINT appointments_patient_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE appointments DROP CONSTRAINT appointments_doctor_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

ALTER TABLE patient_medical_records DROP CONSTRAINT patient_medical_records_recorded_by_user_id_fkey;
ALTER TABLE patient_medical_records
  ADD CONSTRAINT patient_medical_records_recorded_by_user_id_fkey
  FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE doctors DROP CONSTRAINT doctors_user_id_fkey;
ALTER TABLE doctors
  ADD CONSTRAINT doctors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;