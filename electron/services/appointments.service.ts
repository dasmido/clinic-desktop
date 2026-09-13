import { getDatabase } from '../database.js';
import {
  createAppointment as repoCreateAppointment,
  deleteAppointment as repoDeleteAppointment,
  listAppointments as repoListAppointments,
  updateAppointment as repoUpdateAppointment,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '../repositories/appointments.repository.js';
import { isDoctorAvailableForSlot } from '../repositories/doctors.repository.js';
import { assertSignedIn } from './auth.service.js';

export async function listAppointmentsForRange(from: string, to: string) {
  assertSignedIn();
  const db = await getDatabase();
  return repoListAppointments(db, { from: new Date(from), to: new Date(to) });
}

export async function createAppointment(input: CreateAppointmentInput) {
  assertSignedIn();
  const db = await getDatabase();
  const startsAt = new Date(input.starts_at);
  const endsAt = new Date(input.ends_at);

  if (input.doctor_id !== null && !(await isDoctorAvailableForSlot(db, input.doctor_id, startsAt, endsAt))) {
    throw new Error('الطبيب غير متاح خلال الوقت المحدد.');
  }

  return repoCreateAppointment(db, input);
}

export async function updateAppointment(appointmentId: number, input: UpdateAppointmentInput) {
  assertSignedIn();
  const db = await getDatabase();

  if (input.doctor_id != null && input.starts_at !== undefined && input.ends_at !== undefined) {
    const startsAt = new Date(input.starts_at);
    const endsAt = new Date(input.ends_at);

    if (!(await isDoctorAvailableForSlot(db, input.doctor_id, startsAt, endsAt))) {
      throw new Error('الطبيب غير متاح خلال الوقت المحدد.');
    }
  }

  return repoUpdateAppointment(db, appointmentId, input);
}

export async function deleteAppointment(appointmentId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoDeleteAppointment(db, appointmentId);
  return true;
}
