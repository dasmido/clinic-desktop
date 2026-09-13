import type { PrescriptionStatus } from '../../src/database/types.js';
import { getDatabase } from '../database.js';
import {
  createPrescription as repoCreatePrescription,
  deletePrescription as repoDeletePrescription,
  listAllPrescriptions as repoListAllPrescriptions,
  listPrescriptionsByMedicalRecord as repoListPrescriptionsByMedicalRecord,
  listPrescriptionsByPatient as repoListPrescriptionsByPatient,
  updatePrescription as repoUpdatePrescription,
  updatePrescriptionStatus as repoUpdatePrescriptionStatus,
  type CreatePrescriptionInput,
  type UpdatePrescriptionInput,
} from '../repositories/prescriptions.repository.js';
import { assertUserHasRole } from './auth.service.js';

function assertPrescriptionStatus(status: unknown): asserts status is PrescriptionStatus {
  if (status !== 'active' && status !== 'fulfilled' && status !== 'cancelled') {
    throw new Error('A valid prescription status is required.');
  }
}

export async function listAllPrescriptions() {
  assertUserHasRole(['doctor', 'nurse', 'pharmacy', 'admin']);
  const db = await getDatabase();
  return repoListAllPrescriptions(db);
}

export async function listPrescriptionsByPatient(patientId: number) {
  assertUserHasRole(['doctor', 'nurse', 'pharmacy', 'admin']);
  const db = await getDatabase();
  return repoListPrescriptionsByPatient(db, patientId);
}

export async function listPrescriptionsByMedicalRecord(medicalRecordId: number) {
  assertUserHasRole(['doctor', 'nurse', 'pharmacy', 'admin']);
  const db = await getDatabase();
  return repoListPrescriptionsByMedicalRecord(db, medicalRecordId);
}

export async function createPrescription(input: Omit<CreatePrescriptionInput, 'prescribed_by_user_id'>) {
  const user = assertUserHasRole(['doctor', 'admin']);
  const db = await getDatabase();
  return repoCreatePrescription(db, { ...input, prescribed_by_user_id: user.id });
}

export async function updatePrescriptionStatus(prescriptionId: number, status: PrescriptionStatus) {
  assertUserHasRole(['doctor', 'admin']);
  assertPrescriptionStatus(status);
  const db = await getDatabase();
  return repoUpdatePrescriptionStatus(db, prescriptionId, status);
}

export async function updatePrescription(prescriptionId: number, input: UpdatePrescriptionInput) {
  assertUserHasRole(['doctor', 'admin']);
  const db = await getDatabase();
  return repoUpdatePrescription(db, prescriptionId, input);
}

export async function deletePrescription(prescriptionId: number) {
  assertUserHasRole(['doctor', 'admin']);
  const db = await getDatabase();
  await repoDeletePrescription(db, prescriptionId);
  return true;
}
