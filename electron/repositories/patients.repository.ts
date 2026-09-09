import type { Kysely } from 'kysely';
import type { Database, NewPatient, Patient, PatientUpdate } from '../../src/database/types.js';

export type CreatePatientInput = Pick<NewPatient, 'full_name' | 'phone' | 'date_of_birth' | 'notes'>;

export type UpdatePatientInput = Pick<PatientUpdate, 'full_name' | 'phone' | 'date_of_birth' | 'notes'>;

export async function listPatients(
  db: Kysely<Database>,
  search = '',
): Promise<Patient[]> {
  let query = db
    .selectFrom('patients')
    .selectAll()
    .orderBy('full_name', 'asc');

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    query = query.where((expressionBuilder) =>
      expressionBuilder.or([
        expressionBuilder('full_name', 'ilike', `%${normalizedSearch}%`),
        expressionBuilder('phone', 'ilike', `%${normalizedSearch}%`),
      ]),
    );
  }

  return query.execute();
}

export async function findPatientById(
  db: Kysely<Database>,
  patientId: number,
): Promise<Patient | undefined> {
  return db
    .selectFrom('patients')
    .selectAll()
    .where('id', '=', patientId)
    .executeTakeFirst();
}

export async function createPatient(
  db: Kysely<Database>,
  patient: CreatePatientInput,
): Promise<Patient> {
  return db
    .insertInto('patients')
    .values({
      full_name: patient.full_name.trim(),
      phone: patient.phone.trim(),
      date_of_birth: patient.date_of_birth ?? null,
      notes: patient.notes?.trim() ?? '',
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updatePatient(
  db: Kysely<Database>,
  patientId: number,
  patient: UpdatePatientInput,
): Promise<Patient | undefined> {
  return db
    .updateTable('patients')
    .set({
      ...(patient.full_name === undefined ? {} : { full_name: patient.full_name.trim() }),
      ...(patient.phone === undefined ? {} : { phone: patient.phone.trim() }),
      ...(patient.date_of_birth === undefined ? {} : { date_of_birth: patient.date_of_birth }),
      ...(patient.notes === undefined ? {} : { notes: patient.notes.trim() }),
      updated_at: new Date(),
    })
    .where('id', '=', patientId)
    .returningAll()
    .executeTakeFirst();
}