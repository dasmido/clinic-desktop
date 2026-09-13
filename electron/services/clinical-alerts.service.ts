import { getDatabase } from '../database.js';
import {
  createClinicalAlert as repoCreateClinicalAlert,
  deactivateClinicalAlert as repoDeactivateClinicalAlert,
  dismissClinicalAlert as repoDismissClinicalAlert,
  listActiveClinicalAlerts as repoListActiveClinicalAlerts,
  type CreateClinicalAlertInput,
} from '../repositories/clinical-alerts.repository.js';
import { assertUserHasRole } from './auth.service.js';

export async function listActiveClinicalAlerts(patientId: number) {
  assertUserHasRole(['doctor', 'nurse', 'lab', 'pharmacy', 'admin']);
  const db = await getDatabase();
  return repoListActiveClinicalAlerts(db, patientId);
}

export async function createClinicalAlert(input: Omit<CreateClinicalAlertInput, 'created_by_user_id'>) {
  const user = assertUserHasRole(['doctor', 'nurse', 'admin']);
  const db = await getDatabase();
  return repoCreateClinicalAlert(db, { ...input, created_by_user_id: user.id });
}

export async function dismissClinicalAlert(alertId: number) {
  assertUserHasRole(['doctor', 'nurse', 'admin']);
  const db = await getDatabase();
  return repoDismissClinicalAlert(db, alertId);
}

export async function deactivateClinicalAlert(alertId: number) {
  assertUserHasRole(['doctor', 'admin']);
  const db = await getDatabase();
  return repoDeactivateClinicalAlert(db, alertId);
}
