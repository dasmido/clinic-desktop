import { getDatabase } from '../database.js';
import type { VisitStatus } from '../../src/database/types.js';
import {
  createAttachment as repoCreateAttachment,
  createMedicalRecord as repoCreateMedicalRecord,
  deleteAttachment as repoDeleteAttachment,
  deleteMedicalRecord as repoDeleteMedicalRecord,
  listAttachmentsForRecords,
  listMedicalRecordsByPatient,
  listMedicalRecordsForRange,
  updateMedicalRecord as repoUpdateMedicalRecord,
  updateMedicalRecordStatus as repoUpdateMedicalRecordStatus,
  type CreateAttachmentInput,
  type CreateMedicalRecordInput,
  type UpdateMedicalRecordInput,
} from '../repositories/medical-records.repository.js';
import { assertSignedIn } from './auth.service.js';

export async function getMedicalRecordsByPatient(patientId: number) {
  assertSignedIn();
  const db = await getDatabase();
  const records = await listMedicalRecordsByPatient(db, patientId);
  const attachments = await listAttachmentsForRecords(db, records.map((record) => record.id));
  return { records, attachments };
}

export async function getMedicalRecordsForRange(from: string, to: string) {
  assertSignedIn();
  const db = await getDatabase();
  return listMedicalRecordsForRange(db, from, to);
}

export async function createMedicalRecord(input: CreateMedicalRecordInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoCreateMedicalRecord(db, input);
}

export async function updateMedicalRecord(recordId: number, input: UpdateMedicalRecordInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoUpdateMedicalRecord(db, recordId, input);
}

export async function updateMedicalRecordStatus(recordId: number, status: VisitStatus) {
  assertSignedIn();
  const db = await getDatabase();
  return repoUpdateMedicalRecordStatus(db, recordId, status);
}

export async function deleteMedicalRecord(recordId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoDeleteMedicalRecord(db, recordId);
  return true;
}

export async function createAttachment(input: CreateAttachmentInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoCreateAttachment(db, input);
}

export async function deleteAttachment(attachmentId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoDeleteAttachment(db, attachmentId);
  return true;
}
