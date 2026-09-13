import type { Kysely } from 'kysely';
import type {
  Appointment,
  AppointmentStatus,
  Database,
} from '../../src/database/types.js';
import { createTransaction } from './finance.repository.js';

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
  visit_fee: number;
};

export type CreateAppointmentInput = {
  patient_id: number;
  doctor_id: number | null;
  starts_at: Date | string;
  ends_at: Date | string;
  status?: AppointmentStatus;
  notes?: string;
  visit_fee?: number;
};

export type UpdateAppointmentInput = {
  patient_id?: number;
  doctor_id?: number | null;
  starts_at?: Date | string;
  ends_at?: Date | string;
  status?: AppointmentStatus;
  notes?: string;
  visit_fee?: number;
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

  const rows = await query.execute();
  return rows.map((row) => ({
    ...row,
    visit_fee: Number(row.visit_fee ?? 0),
  }));
}

export async function findAppointmentById(
  db: Kysely<Database>,
  appointmentId: number,
): Promise<AppointmentWithPatient | undefined> {
  const row = await db
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

  if (!row) {
    return undefined;
  }

  return {
    ...row,
    visit_fee: Number(row.visit_fee ?? 0),
  };
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
  return db.transaction().execute(async (trx) => {
    const startsAt = toTimestamp(appointment.starts_at);
    const endsAt = toTimestamp(appointment.ends_at);
    const status = appointment.status ?? 'scheduled';

    if (status !== 'cancelled') {
      const hasConflict = await hasSchedulingConflict(trx, appointment.doctor_id, startsAt, endsAt);

      if (hasConflict) {
        throw new Error('يوجد موعد نشط خلال هذا الوقت.');
      }
    }

    let visitFee = appointment.visit_fee;
    let doctorName: string | undefined;

    if (appointment.doctor_id) {
      const doc = await trx
        .selectFrom('doctors')
        .select(['display_name', 'consultation_fee'])
        .where('id', '=', appointment.doctor_id)
        .executeTakeFirst();
      if (doc) {
        doctorName = doc.display_name;
        if (visitFee === undefined) {
          visitFee = Number(doc.consultation_fee ?? 0);
        }
      }
    }

    if (visitFee === undefined) {
      visitFee = 0;
    }

    const created = await trx
      .insertInto('appointments')
      .values({
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        starts_at: startsAt,
        ends_at: endsAt,
        status,
        notes: appointment.notes?.trim() ?? '',
        visit_fee: visitFee,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    if (visitFee > 0) {
      const occurredOn = startsAt.toISOString().slice(0, 10);
      await createTransaction(trx, {
        transaction_type: 'income',
        category: 'كشفية',
        description: doctorName ? `كشفية طبيب: د. ${doctorName}` : 'كشفية موعد',
        amount: visitFee,
        occurred_on: occurredOn,
        patient_id: appointment.patient_id,
      });
    }

    return {
      ...created,
      visit_fee: Number(created.visit_fee ?? 0),
    };
  });
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

  const updated = await db
    .updateTable('appointments')
    .set({
      ...(appointment.patient_id === undefined ? {} : { patient_id: appointment.patient_id }),
      ...(appointment.doctor_id === undefined ? {} : { doctor_id: appointment.doctor_id }),
      ...(appointment.starts_at === undefined ? {} : { starts_at: startsAt }),
      ...(appointment.ends_at === undefined ? {} : { ends_at: endsAt }),
      ...(appointment.status === undefined ? {} : { status: appointment.status }),
      ...(appointment.notes === undefined ? {} : { notes: appointment.notes.trim() }),
      ...(appointment.visit_fee === undefined ? {} : { visit_fee: appointment.visit_fee }),
      updated_at: new Date(),
    })
    .where('id', '=', appointmentId)
    .returningAll()
    .executeTakeFirst();

  if (!updated) {
    return undefined;
  }

  return {
    ...updated,
    visit_fee: Number(updated.visit_fee ?? 0),
  };
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