import type { Kysely } from 'kysely';
import type { Database, LabOrder, LabOrderStatus, LabResult, LabResultInterpretation, PatientMedicalRecord } from '../../src/database/types.js';

export type LabOrderWithDetails = LabOrder & { ordered_by_name: string; patient_name: string };
export type LabResultWithRecorder = LabResult & { recorded_by_name: string };

export type CreateLabOrderInput = {
  medical_record_id: number;
  patient_id: number;
  ordered_by_user_id: number;
  test_name: string;
  urgency: 'routine' | 'urgent';
  clinical_indication: string;
};

export type CreateLabResultInput = {
  patient_id: number;
  test_name: string;
  result_value: string;
  reference_range: string;
  interpretation: LabResultInterpretation;
  notes: string;
  recorded_by_user_id: number;
};

export async function listLabOrdersByPatient(db: Kysely<Database>, patientId: number): Promise<LabOrderWithDetails[]> {
  return db
    .selectFrom('lab_orders')
    .innerJoin('users', 'users.id', 'lab_orders.ordered_by_user_id')
    .innerJoin('patients', 'patients.id', 'lab_orders.patient_id')
    .selectAll('lab_orders')
    .select(['users.username as ordered_by_name', 'patients.full_name as patient_name'])
    .where('lab_orders.patient_id', '=', patientId)
    .orderBy('lab_orders.ordered_on', 'desc')
    .execute();
}

export async function listOpenLabOrders(db: Kysely<Database>): Promise<LabOrderWithDetails[]> {
  return db
    .selectFrom('lab_orders')
    .innerJoin('users', 'users.id', 'lab_orders.ordered_by_user_id')
    .innerJoin('patients', 'patients.id', 'lab_orders.patient_id')
    .selectAll('lab_orders')
    .select(['users.username as ordered_by_name', 'patients.full_name as patient_name'])
    .where('lab_orders.result_status', '=', 'pending')
    .orderBy('lab_orders.urgency', 'desc')
    .orderBy('lab_orders.ordered_on', 'asc')
    .execute();
}

export async function listLabResultsByOrder(db: Kysely<Database>, orderId: number): Promise<LabResultWithRecorder[]> {
  return db
    .selectFrom('lab_results')
    .innerJoin('users', 'users.id', 'lab_results.recorded_by_user_id')
    .selectAll('lab_results')
    .select('users.username as recorded_by_name')
    .where('lab_results.lab_order_id', '=', orderId)
    .orderBy('lab_results.id', 'desc')
    .execute();
}

export async function createLabOrder(db: Kysely<Database>, order: CreateLabOrderInput): Promise<LabOrder> {
  const medicalRecord: Pick<PatientMedicalRecord, 'patient_id'> | undefined = await db
    .selectFrom('patient_medical_records')
    .select('patient_id')
    .where('id', '=', order.medical_record_id)
    .executeTakeFirst();

  if (!medicalRecord || medicalRecord.patient_id !== order.patient_id) {
    throw new Error('The medical record does not belong to this patient.');
  }

  return db.insertInto('lab_orders').values(order).returningAll().executeTakeFirstOrThrow();
}

export async function createLabResult(
  db: Kysely<Database>,
  orderId: number,
  result: CreateLabResultInput,
): Promise<LabResult> {
  const order = await db
    .selectFrom('lab_orders')
    .select(['patient_id', 'result_status'])
    .where('id', '=', orderId)
    .executeTakeFirst();

  if (!order || order.patient_id !== result.patient_id || order.result_status === 'cancelled') {
    throw new Error('The lab order cannot accept results.');
  }

  const createdResult = await db
    .insertInto('lab_results')
    .values({ ...result, lab_order_id: orderId })
    .returningAll()
    .executeTakeFirstOrThrow();

  await db
    .updateTable('lab_orders')
    .set({ result_status: 'resulted' })
    .where('id', '=', orderId)
    .executeTakeFirstOrThrow();

  return createdResult;
}

export async function updateLabOrderStatus(
  db: Kysely<Database>,
  orderId: number,
  resultStatus: LabOrderStatus,
): Promise<LabOrder> {
  return db
    .updateTable('lab_orders')
    .set({ result_status: resultStatus })
    .where('id', '=', orderId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteLabOrder(db: Kysely<Database>, orderId: number) {
  return db.deleteFrom('lab_orders').where('id', '=', orderId).executeTakeFirst();
}