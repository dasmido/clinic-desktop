import type { Kysely } from 'kysely';
import type { ClinicalAlert, ClinicalAlertSeverity, ClinicalAlertType, Database } from '../../src/database/types.js';

export type CreateClinicalAlertInput = {
  patient_id: number;
  related_medical_record_id: number | null;
  alert_type: ClinicalAlertType;
  title: string;
  description: string;
  severity: ClinicalAlertSeverity;
  dismissible: boolean;
  created_by_user_id: number;
};

export async function listActiveClinicalAlerts(db: Kysely<Database>, patientId: number): Promise<ClinicalAlert[]> {
  return db
    .selectFrom('patient_clinical_alerts')
    .selectAll()
    .where('patient_id', '=', patientId)
    .where('is_active', '=', true)
    .where('dismissed_at', 'is', null)
    .orderBy('created_at', 'desc')
    .execute();
}

export async function createClinicalAlert(db: Kysely<Database>, alert: CreateClinicalAlertInput): Promise<ClinicalAlert> {
  return db.insertInto('patient_clinical_alerts').values(alert).returningAll().executeTakeFirstOrThrow();
}

export async function dismissClinicalAlert(db: Kysely<Database>, alertId: number): Promise<ClinicalAlert> {
  return db
    .updateTable('patient_clinical_alerts')
    .set({ dismissed_at: new Date() })
    .where('id', '=', alertId)
    .where('dismissible', '=', true)
    .where('is_active', '=', true)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deactivateClinicalAlert(db: Kysely<Database>, alertId: number): Promise<ClinicalAlert> {
  return db
    .updateTable('patient_clinical_alerts')
    .set({ is_active: false })
    .where('id', '=', alertId)
    .returningAll()
    .executeTakeFirstOrThrow();
}