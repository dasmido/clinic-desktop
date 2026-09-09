CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  CHECK (ends_at > starts_at),
  UNIQUE (doctor_id, day_of_week, starts_at, ends_at)
);

ALTER TABLE appointments
  ADD COLUMN doctor_id INTEGER REFERENCES doctors(id);

CREATE INDEX appointments_doctor_schedule_idx
  ON appointments (doctor_id, starts_at, ends_at);