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
};

export type CreateAppointmentInput = {
  patient_id: number;
  starts_at: Date | string;
  ends_at: Date | string;
  status?: AppointmentStatus;
  notes?: string;
};

export type UpdateAppointmentInput = {
  patient_id?: number;
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
    .selectAll('appointments')
    .select([
      'patients.full_name as patient_name',
      'patients.phone as patient_phone',
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
    .selectAll('appointments')
    .select([
      'patients.full_name as patient_name',
      'patients.phone as patient_phone',
    ])
    .where('appointments.id', '=', appointmentId)
    .executeTakeFirst();
}

export async function hasSchedulingConflict(
  db: Kysely<Database>,
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
  const hasConflict = await hasSchedulingConflict(db, startsAt, endsAt);

  if (hasConflict) {
    throw new Error('An active appointment already occupies this time slot.');
  }

  return db
    .insertInto('appointments')
    .values({
      patient_id: appointment.patient_id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: appointment.status ?? 'scheduled',
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
    .select(['starts_at', 'ends_at', 'status'])
    .where('id', '=', appointmentId)
    .executeTakeFirst();

  if (!existing) {
    return undefined;
  }

  const startsAt = appointment.starts_at === undefined
    ? existing.starts_at
    : toTimestamp(appointment.starts_at);
  const endsAt = appointment.ends_at === undefined
    ? existing.ends_at
    : toTimestamp(appointment.ends_at);
  const status = appointment.status ?? existing.status;

  if (status !== 'cancelled') {
    const hasConflict = await hasSchedulingConflict(db, startsAt, endsAt, appointmentId);

    if (hasConflict) {
      throw new Error('An active appointment already occupies this time slot.');
    }
  }

  return db
    .updateTable('appointments')
    .set({
      ...(appointment.patient_id === undefined ? {} : { patient_id: appointment.patient_id }),
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