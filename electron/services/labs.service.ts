import type { LabOrderStatus } from '../../src/database/types.js';
import { getDatabase } from '../database.js';
import {
  createLabOrder as repoCreateLabOrder,
  createLabResult as repoCreateLabResult,
  deleteLabOrder as repoDeleteLabOrder,
  listClosedLabOrders as repoListClosedLabOrders,
  listLabOrdersByPatient as repoListLabOrdersByPatient,
  listLabResultsByOrder as repoListLabResultsByOrder,
  listOpenLabOrders as repoListOpenLabOrders,
  updateLabOrderStatus as repoUpdateLabOrderStatus,
  type CreateLabOrderInput,
  type CreateLabResultInput,
} from '../repositories/lab-orders.repository.js';
import { assertUserHasRole } from './auth.service.js';

function assertLabOrderStatus(status: unknown): asserts status is LabOrderStatus {
  if (status !== 'pending' && status !== 'resulted' && status !== 'cancelled') {
    throw new Error('A valid lab order status is required.');
  }
}

export async function listLabOrdersByPatient(patientId: number) {
  assertUserHasRole(['doctor', 'nurse', 'lab', 'admin']);
  const db = await getDatabase();
  return repoListLabOrdersByPatient(db, patientId);
}

export async function listOpenLabOrders() {
  assertUserHasRole(['doctor', 'nurse', 'lab', 'admin']);
  const db = await getDatabase();
  return repoListOpenLabOrders(db);
}

export async function listClosedLabOrders(limit?: number) {
  assertUserHasRole(['doctor', 'nurse', 'lab', 'admin']);
  const db = await getDatabase();
  return repoListClosedLabOrders(db, limit);
}

export async function listLabResultsByOrder(orderId: number) {
  assertUserHasRole(['doctor', 'nurse', 'lab', 'admin']);
  const db = await getDatabase();
  return repoListLabResultsByOrder(db, orderId);
}

export async function createLabOrder(input: Omit<CreateLabOrderInput, 'ordered_by_user_id'>) {
  const user = assertUserHasRole(['doctor', 'nurse', 'admin']);
  const db = await getDatabase();
  return repoCreateLabOrder(db, { ...input, ordered_by_user_id: user.id });
}

export async function createLabResult(orderId: number, input: Omit<CreateLabResultInput, 'recorded_by_user_id'>) {
  const user = assertUserHasRole(['lab', 'admin']);
  const db = await getDatabase();
  return repoCreateLabResult(db, orderId, { ...input, recorded_by_user_id: user.id });
}

export async function updateLabOrderStatus(orderId: number, status: LabOrderStatus) {
  assertUserHasRole(['doctor', 'nurse', 'admin']);
  assertLabOrderStatus(status);
  const db = await getDatabase();
  return repoUpdateLabOrderStatus(db, orderId, status);
}

export async function deleteLabOrder(orderId: number) {
  assertUserHasRole(['doctor', 'admin']);
  const db = await getDatabase();
  await repoDeleteLabOrder(db, orderId);
  return true;
}
