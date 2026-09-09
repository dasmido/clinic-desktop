import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
export type DateOnly = ColumnType<string | null, string | null | undefined, string | null>;

export type UserRole = 'doctor' | 'nurse' | 'lab' | 'pharmacy' | 'moderator' | 'admin';
export type AppointmentStatus = 'scheduled' | 'arrived' | 'completed' | 'cancelled';

export type UsersTable = {
  id: Generated<number>;
  username: string;
  password_hash: string;
  role: ColumnType<UserRole, UserRole | undefined, UserRole>;
  created_at: Timestamp;
};

export type PatientsTable = {
  id: Generated<number>;
  full_name: string;
  phone: string;
  date_of_birth: DateOnly;
  notes: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AppointmentsTable = {
  id: Generated<number>;
  patient_id: number;
  doctor_id: number | null;
  starts_at: Timestamp;
  ends_at: Timestamp;
  status: ColumnType<AppointmentStatus, AppointmentStatus | undefined, AppointmentStatus>;
  notes: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type DoctorsTable = {
  id: Generated<number>;
  user_id: number;
  display_name: string;
  created_at: Timestamp;
};

export type DoctorAvailabilityTable = {
  id: Generated<number>;
  doctor_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

export type Database = {
  users: UsersTable;
  patients: PatientsTable;
  appointments: AppointmentsTable;
  doctors: DoctorsTable;
  doctor_availability: DoctorAvailabilityTable;
};

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type Patient = Selectable<PatientsTable>;
export type NewPatient = Insertable<PatientsTable>;
export type PatientUpdate = Updateable<PatientsTable>;

export type Appointment = Selectable<AppointmentsTable>;
export type NewAppointment = Insertable<AppointmentsTable>;
export type AppointmentUpdate = Updateable<AppointmentsTable>;

export type Doctor = Selectable<DoctorsTable>;
export type NewDoctor = Insertable<DoctorsTable>;
export type DoctorAvailability = Selectable<DoctorAvailabilityTable>;