import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
export type DateOnly = ColumnType<string | null, string | null | undefined, string | null>;

export type UserRole = 'admin' | 'staff';
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
  starts_at: Timestamp;
  ends_at: Timestamp;
  status: ColumnType<AppointmentStatus, AppointmentStatus | undefined, AppointmentStatus>;
  notes: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Database = {
  users: UsersTable;
  patients: PatientsTable;
  appointments: AppointmentsTable;
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