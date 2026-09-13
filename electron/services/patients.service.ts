import { getDatabase } from '../database.js';
import {
  createPatient as repoCreatePatient,
  deletePatient as repoDeletePatient,
  listPatients as repoListPatients,
  updatePatient as repoUpdatePatient,
  type CreatePatientInput,
  type UpdatePatientInput,
} from '../repositories/patients.repository.js';
import { assertSignedIn } from './auth.service.js';

export async function listPatients(search?: string) {
  assertSignedIn();
  const db = await getDatabase();
  return repoListPatients(db, search);
}

export async function createPatient(input: CreatePatientInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoCreatePatient(db, input);
}

export async function updatePatient(patientId: number, input: UpdatePatientInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoUpdatePatient(db, patientId, input);
}

export async function deletePatient(patientId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoDeletePatient(db, patientId);
  return true;
}
