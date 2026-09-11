import type { Kysely } from 'kysely';
import type { Database, PatientMedicalRecord, Prescription, PrescriptionStatus } from '../../src/database/types.js';

export type PrescriptionWithAuthor = Prescription & { prescribed_by_name: string };

export type CreatePrescriptionInput = {
  medical_record_id: number;
  patient_id: number;
  prescribed_by_user_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number | null;
  notes: string;
};

export type UpdatePrescriptionInput = Omit<CreatePrescriptionInput, 'medical_record_id' | 'patient_id' | 'prescribed_by_user_id'>;

export async function listPrescriptionsByPatient(
  db: Kysely<Database>,
  patientId: number,
): Promise<PrescriptionWithAuthor[]> {
  return db
    .selectFrom('prescriptions')
    .innerJoin('users', 'users.id', 'prescriptions.prescribed_by_user_id')
    .selectAll('prescriptions')
    .select('users.username as prescribed_by_name')
    .where('prescriptions.patient_id', '=', patientId)
    .orderBy('prescriptions.prescribed_on', 'desc')
    .execute();
}

export async function listPrescriptionsByMedicalRecord(
  db: Kysely<Database>,
  medicalRecordId: number,
): Promise<PrescriptionWithAuthor[]> {
  return db
    .selectFrom('prescriptions')
    .innerJoin('users', 'users.id', 'prescriptions.prescribed_by_user_id')
    .selectAll('prescriptions')
    .select('users.username as prescribed_by_name')
    .where('prescriptions.medical_record_id', '=', medicalRecordId)
    .orderBy('prescriptions.id', 'desc')
    .execute();
}

export async function createPrescription(
  db: Kysely<Database>,
  prescription: CreatePrescriptionInput,
): Promise<Prescription> {
  const medicalRecord: Pick<PatientMedicalRecord, 'patient_id'> | undefined = await db
    .selectFrom('patient_medical_records')
    .select('patient_id')
    .where('id', '=', prescription.medical_record_id)
    .executeTakeFirst();

  if (!medicalRecord || medicalRecord.patient_id !== prescription.patient_id) {
    throw new Error('The medical record does not belong to this patient.');
  }

  return db
    .insertInto('prescriptions')
    .values(prescription)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updatePrescriptionStatus(
  db: Kysely<Database>,
  prescriptionId: number,
  status: PrescriptionStatus,
): Promise<Prescription> {
  return db
    .updateTable('prescriptions')
    .set({ status })
    .where('id', '=', prescriptionId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updatePrescription(
  db: Kysely<Database>,
  prescriptionId: number,
  prescription: UpdatePrescriptionInput,
): Promise<Prescription> {
  return db
    .updateTable('prescriptions')
    .set(prescription)
    .where('id', '=', prescriptionId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePrescription(db: Kysely<Database>, prescriptionId: number) {
  return db
    .deleteFrom('prescriptions')
    .where('id', '=', prescriptionId)
    .executeTakeFirst();
}