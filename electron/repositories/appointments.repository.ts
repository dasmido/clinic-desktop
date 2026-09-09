import type { Kysely } from 'kysely';
import type {
  Appointment,
  AppointmentStatus,
  Database,
} from '../../src/database/types.js';

function toTimestamp(value: Date | string): Date {
  const timestamp = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('Appointment times must be valid dates.');
  }

  return timestamp;
}

export type AppointmentWithPatient = Appointment & {
  patient_name: string;
  patient_phone: string;
  doctor_name: string | null;
};

export type CreateAppointmentInput = {
  patient_id: number;
  doctor_id: number | null;
  starts_at: Date | string;
  ends_at: Date | string;
  status?: AppointmentStatus;
  notes?: string;
};

export type UpdateAppointmentInput = {
  patient_id?: number;
  doctor_id?: number | null;
  starts_at?: Date | string;
  ends_at?: Date | string;
  status?: AppointmentStatus;
  notes?: string;
};

export type AppointmentFilters = {
  from: Date;
  to: Date;
  patientId?: number;
  status?: AppointmentStatus;
};

export async function listAppointments(
  db: Kysely<Database>,
  filters: AppointmentFilters,
): Promise<AppointmentWithPatient[]> {
  let query = db
    .selectFrom('appointments')
    .innerJoin('patients', 'patients.id', 'appointments.patient_id')
    .leftJoin('doctors', 'doctors.id', 'appointments.doctor_id')
    .selectAll('appointments')
    .select([
      'patients.full_name as patient_name',
      'patients.phone as patient_phone',
      'doctors.display_name as doctor_name',
    ])
    .where('appointments.starts_at', '>=', filters.from)
    .where('appointments.starts_at', '<', filters.to)
    .orderBy('appointments.starts_at', 'asc');

  if (filters.patientId !== undefined) {
    query = query.where('appointments.patient_id', '=', filters.patientId);
  }

  if (filters.status !== undefined) {
    query = query.where('appointments.status', '=', filters.status);
  }

  return query.execute();
}

export async function findAppointmentById(
  db: Kysely<Database>,
  appointmentId: number,
): Promise<AppointmentWithPatient | undefined> {
  return db
    .selectFrom('appointments')
    .innerJoin('patients', 'patients.id', 'appointments.patient_id')
    .leftJoin('doctors', 'doctors.id', 'appointments.doctor_id')
    .selectAll('appointments')
    .select([
      'patients.full_name as patient_name',
      'patients.phone as patient_phone',
      'doctors.display_name as doctor_name',
    ])
    .where('appointments.id', '=', appointmentId)
    .executeTakeFirst();
}

export async function hasSchedulingConflict(
  db: Kysely<Database>,
  doctorId: number | null,
  startsAt: Date,
  endsAt: Date,
  excludeAppointmentId?: number,
): Promise<boolean> {
  let query = db
    .selectFrom('appointments')
    .select('id')
    .where('status', '!=', 'cancelled')
    .where('starts_at', '<', endsAt)
    .where('ends_at', '>', startsAt);

  if (doctorId !== null) {
    query = query.where('doctor_id', '=', doctorId);
  }

  if (excludeAppointmentId !== undefined) {
    query = query.where('id', '!=', excludeAppointmentId);
  }

  return Boolean(await query.executeTakeFirst());
}

export async function createAppointment(
  db: Kysely<Database>,
  appointment: CreateAppointmentInput,
): Promise<Appointment> {
  const startsAt = toTimestamp(appointment.starts_at);
  const endsAt = toTimestamp(appointment.ends_at);
  const status = appointment.status ?? 'scheduled';

  if (status !== 'cancelled') {
    const hasConflict = await hasSchedulingConflict(db, appointment.doctor_id, startsAt, endsAt);

    if (hasConflict) {
      throw new Error('يوجد موعد نشط خلال هذا الوقت.');
    }
  }

  return db
    .insertInto('appointments')
    .values({
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      notes: appointment.notes?.trim() ?? '',
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateAppointment(
  db: Kysely<Database>,
  appointmentId: number,
  appointment: UpdateAppointmentInput,
): Promise<Appointment | undefined> {
  const existing = await db
    .selectFrom('appointments')
    .select(['starts_at', 'ends_at', 'status', 'doctor_id'])
    .where('id', '=', appointmentId)
    .executeTakeFirst();

  if (!existing) {
    return undefined;
  }

  const startsAt = appointment.starts_at === undefined
    ? toTimestamp(existing.starts_at)
    : toTimestamp(appointment.starts_at);
  const endsAt = appointment.ends_at === undefined
    ? toTimestamp(existing.ends_at)
    : toTimestamp(appointment.ends_at);
  const status = appointment.status ?? existing.status;
  const doctorId = appointment.doctor_id === undefined ? existing.doctor_id : appointment.doctor_id;

  if (status !== 'cancelled') {
    const hasConflict = await hasSchedulingConflict(db, doctorId, startsAt, endsAt, appointmentId);

    if (hasConflict) {
      throw new Error('يوجد موعد نشط خلال هذا الوقت.');
    }
  }

  return db
    .updateTable('appointments')
    .set({
      ...(appointment.patient_id === undefined ? {} : { patient_id: appointment.patient_id }),
      ...(appointment.doctor_id === undefined ? {} : { doctor_id: appointment.doctor_id }),
      ...(appointment.starts_at === undefined ? {} : { starts_at: startsAt }),
      ...(appointment.ends_at === undefined ? {} : { ends_at: endsAt }),
      ...(appointment.status === undefined ? {} : { status: appointment.status }),
      ...(appointment.notes === undefined ? {} : { notes: appointment.notes.trim() }),
      updated_at: new Date(),
    })
    .where('id', '=', appointmentId)
    .returningAll()
    .executeTakeFirst();
}

export async function updateAppointmentStatus(
  db: Kysely<Database>,
  appointmentId: number,
  status: AppointmentStatus,
): Promise<Appointment | undefined> {
  return db
    .updateTable('appointments')
    .set({
      status,
      updated_at: new Date(),
    })
    .where('id', '=', appointmentId)
    .returningAll()
    .executeTakeFirst();
}

export async function deleteAppointment(db: Kysely<Database>, appointmentId: number) {
  return db
    .deleteFrom('appointments')
    .where('id', '=', appointmentId)
    .executeTakeFirst();
}