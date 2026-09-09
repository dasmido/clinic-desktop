import type { Kysely } from 'kysely';
import type { Database, PatientMedicalRecord, PatientRecordAttachment } from '../../src/database/types.js';

export type MedicalRecordWithAuthor = PatientMedicalRecord & { recorded_by_name: string | null };

export type CreateMedicalRecordInput = {
  patient_id: number;
  recorded_by_user_id: number | null;
  visit_date: Date | string;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  clinical_notes: string;
  blood_pressure: string;
  temperature_celsius: number | null;
  weight_kg: number | null;
};

export type CreateAttachmentInput = {
  medical_record_id: number;
  original_name: string;
  stored_name: string;
  file_size_bytes: number;
};

export async function findMedicalRecordById(
  db: Kysely<Database>,
  recordId: number,
): Promise<PatientMedicalRecord | undefined> {
  return db
    .selectFrom('patient_medical_records')
    .selectAll()
    .where('id', '=', recordId)
    .executeTakeFirst();
}

export async function listMedicalRecordsByPatient(
  db: Kysely<Database>,
  patientId: number,
): Promise<MedicalRecordWithAuthor[]> {
  return db
    .selectFrom('patient_medical_records as records')
    .leftJoin('users', 'users.id', 'records.recorded_by_user_id')
    .selectAll('records')
    .select('users.username as recorded_by_name')
    .where('records.patient_id', '=', patientId)
    .orderBy('records.visit_date', 'desc')
    .execute();
}

export async function createMedicalRecord(
  db: Kysely<Database>,
  record: CreateMedicalRecordInput,
): Promise<PatientMedicalRecord> {
  return db
    .insertInto('patient_medical_records')
    .values(record)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMedicalRecord(db: Kysely<Database>, recordId: number) {
  return db
    .deleteFrom('patient_medical_records')
    .where('id', '=', recordId)
    .executeTakeFirst();
}

export async function listAttachmentsForRecords(
  db: Kysely<Database>,
  recordIds: number[],
): Promise<PatientRecordAttachment[]> {
  if (!recordIds.length) return [];

  return db
    .selectFrom('patient_record_attachments')
    .selectAll()
    .where('medical_record_id', 'in', recordIds)
    .orderBy('id', 'desc')
    .execute();
}

export async function createAttachment(
  db: Kysely<Database>,
  attachment: CreateAttachmentInput,
): Promise<PatientRecordAttachment> {
  return db
    .insertInto('patient_record_attachments')
    .values(attachment)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAttachment(db: Kysely<Database>, attachmentId: number) {
  return db
    .deleteFrom('patient_record_attachments')
    .where('id', '=', attachmentId)
    .executeTakeFirst();
}
