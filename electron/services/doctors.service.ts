import { getDatabase } from '../database.js';
import {
  addDoctorAvailability as repoAddDoctorAvailability,
  createDoctorProfile as repoCreateDoctorProfile,
  deleteDoctor as repoDeleteDoctor,
  listDoctorAvailability as repoListDoctorAvailability,
  listDoctors as repoListDoctors,
  removeDoctorAvailability as repoRemoveDoctorAvailability,
  updateDoctorConsultationFee as repoUpdateDoctorConsultationFee,
} from '../repositories/doctors.repository.js';
import { assertSignedIn } from './auth.service.js';

export async function listDoctors() {
  assertSignedIn();
  const db = await getDatabase();
  return repoListDoctors(db);
}

export async function createDoctorProfile(userId: number, displayName: string, consultationFee?: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoCreateDoctorProfile(db, userId, displayName, consultationFee ?? 0);
  return true;
}

export async function updateDoctorConsultationFee(doctorId: number, consultationFee: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoUpdateDoctorConsultationFee(db, doctorId, consultationFee);
  return true;
}

export async function deleteDoctor(doctorId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoDeleteDoctor(db, doctorId);
  return true;
}

export async function listDoctorAvailability(doctorId: number) {
  assertSignedIn();
  const db = await getDatabase();
  return repoListDoctorAvailability(db, doctorId);
}

export async function addDoctorAvailability(doctorId: number, dayOfWeek: number, startsAt: string, endsAt: string) {
  assertSignedIn();
  const db = await getDatabase();
  await repoAddDoctorAvailability(db, doctorId, dayOfWeek, startsAt, endsAt);
  return true;
}

export async function removeDoctorAvailability(availabilityId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoRemoveDoctorAvailability(db, availabilityId);
  return true;
}
