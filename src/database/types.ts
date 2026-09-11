import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
export type DateOnly = ColumnType<string | null, string | null | undefined, string | null>;

export type UserRole = 'doctor' | 'nurse' | 'lab' | 'pharmacy' | 'moderator' | 'admin';
export type AppointmentStatus = 'scheduled' | 'arrived' | 'completed' | 'cancelled';

export type UsersTable = {
  id: Generated<number>;
  username: string;
  password_hash: string;
  role: ColumnType<UserRole, UserRole | undefined, UserRole>;
  created_at: Timestamp;
};

export type PatientsTable = {
  id: Generated<number>;
  full_name: string;
  phone: string;
  date_of_birth: DateOnly;
  notes: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AppointmentsTable = {
  id: Generated<number>;
  patient_id: number;
  doctor_id: number | null;
  starts_at: Timestamp;
  ends_at: Timestamp;
  status: ColumnType<AppointmentStatus, AppointmentStatus | undefined, AppointmentStatus>;
  notes: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type DoctorsTable = {
  id: Generated<number>;
  user_id: number;
  display_name: string;
  created_at: Timestamp;
};

export type DoctorAvailabilityTable = {
  id: Generated<number>;
  doctor_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

export type InventoryItemsTable = {
  id: Generated<number>;
  name: string;
  sku: string | null;
  unit: ColumnType<string, string | undefined, string>;
  quantity: number;
  reorder_level: ColumnType<number, number | undefined, number>;
  unit_cost: ColumnType<number, number | undefined, number>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type InventoryMovementsTable = {
  id: Generated<number>;
  inventory_item_id: number;
  quantity_change: number;
  reason: string;
  notes: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
};

export type FinancialTransactionType = 'income' | 'expense';
export type PrescriptionStatus = 'active' | 'fulfilled' | 'cancelled';
export type LabOrderUrgency = 'routine' | 'urgent';
export type LabOrderStatus = 'pending' | 'resulted' | 'cancelled';
export type LabResultInterpretation = '' | 'normal' | 'low' | 'high' | 'critical';
export type ClinicalAlertType = 'allergy' | 'contraindication' | 'critical_value' | 'follow_up_due';
export type ClinicalAlertSeverity = 'info' | 'warning' | 'critical';
export type VisitTemplateData = { sections: Array<{ key: string; label: string; type: 'text' | 'vitals' }> };

export type FinancialTransactionsTable = {
  id: Generated<number>;
  transaction_type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  occurred_on: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
};

export type PatientMedicalRecordsTable = {
  id: Generated<number>;
  patient_id: number;
  doctor_id: number | null;
  recorded_by_user_id: number | null;
  visit_date: Timestamp;
  chief_complaint: ColumnType<string, string | undefined, string>;
  diagnosis: ColumnType<string, string | undefined, string>;
  treatment_plan: ColumnType<string, string | undefined, string>;
  clinical_notes: ColumnType<string, string | undefined, string>;
  blood_pressure: ColumnType<string, string | undefined, string>;
  temperature_celsius: number | null;
  weight_kg: number | null;
  created_at: Timestamp;
};

export type PatientRecordAttachmentsTable = {
  id: Generated<number>;
  medical_record_id: number;
  original_name: string;
  stored_name: string;
  mime_type: ColumnType<string, string | undefined, string>;
  file_size_bytes: number;
  created_at: Timestamp;
};

export type PrescriptionsTable = {
  id: Generated<number>;
  medical_record_id: number;
  patient_id: number;
  prescribed_by_user_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number | null;
  notes: ColumnType<string, string | undefined, string>;
  status: ColumnType<PrescriptionStatus, PrescriptionStatus | undefined, PrescriptionStatus>;
  prescribed_on: Timestamp;
  created_at: Timestamp;
};

export type LabOrdersTable = {
  id: Generated<number>;
  medical_record_id: number;
  patient_id: number;
  ordered_by_user_id: number;
  test_name: string;
  urgency: ColumnType<LabOrderUrgency, LabOrderUrgency | undefined, LabOrderUrgency>;
  clinical_indication: ColumnType<string, string | undefined, string>;
  result_status: ColumnType<LabOrderStatus, LabOrderStatus | undefined, LabOrderStatus>;
  ordered_on: Timestamp;
  created_at: Timestamp;
};

export type LabResultsTable = {
  id: Generated<number>;
  lab_order_id: number;
  patient_id: number;
  test_name: string;
  result_value: string;
  reference_range: ColumnType<string, string | undefined, string>;
  interpretation: ColumnType<LabResultInterpretation, LabResultInterpretation | undefined, LabResultInterpretation>;
  notes: ColumnType<string, string | undefined, string>;
  recorded_by_user_id: number;
  recorded_on: Timestamp;
  created_at: Timestamp;
};

export type VisitTemplatesTable = {
  id: Generated<number>;
  name: string;
  visit_type: string;
  description: ColumnType<string, string | undefined, string>;
  created_by_user_id: number;
  template_data: ColumnType<VisitTemplateData, VisitTemplateData, VisitTemplateData>;
  is_active: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type VisitTemplateUsesTable = {
  id: Generated<number>;
  medical_record_id: number;
  template_id: number;
  created_at: Timestamp;
};

export type PatientClinicalAlertsTable = {
  id: Generated<number>;
  patient_id: number;
  related_medical_record_id: number | null;
  alert_type: ClinicalAlertType;
  title: string;
  description: ColumnType<string, string | undefined, string>;
  severity: ColumnType<ClinicalAlertSeverity, ClinicalAlertSeverity | undefined, ClinicalAlertSeverity>;
  dismissible: ColumnType<boolean, boolean | undefined, boolean>;
  is_active: ColumnType<boolean, boolean | undefined, boolean>;
  created_by_user_id: number;
  created_at: Timestamp;
  dismissed_at: Timestamp | null;
};

export type Database = {
  users: UsersTable;
  patients: PatientsTable;
  appointments: AppointmentsTable;
  doctors: DoctorsTable;
  doctor_availability: DoctorAvailabilityTable;
  inventory_items: InventoryItemsTable;
  inventory_movements: InventoryMovementsTable;
  financial_transactions: FinancialTransactionsTable;
  patient_medical_records: PatientMedicalRecordsTable;
  patient_record_attachments: PatientRecordAttachmentsTable;
  prescriptions: PrescriptionsTable;
  lab_orders: LabOrdersTable;
  lab_results: LabResultsTable;
  visit_templates: VisitTemplatesTable;
  visit_template_uses: VisitTemplateUsesTable;
  patient_clinical_alerts: PatientClinicalAlertsTable;
};

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type Patient = Selectable<PatientsTable>;
export type NewPatient = Insertable<PatientsTable>;
export type PatientUpdate = Updateable<PatientsTable>;

export type Appointment = Selectable<AppointmentsTable>;
export type NewAppointment = Insertable<AppointmentsTable>;
export type AppointmentUpdate = Updateable<AppointmentsTable>;

export type Doctor = Selectable<DoctorsTable>;
export type NewDoctor = Insertable<DoctorsTable>;
export type DoctorAvailability = Selectable<DoctorAvailabilityTable>;
export type NewDoctorAvailability = Insertable<DoctorAvailabilityTable>;

export type InventoryItem = Selectable<InventoryItemsTable>;
export type NewInventoryItem = Insertable<InventoryItemsTable>;
export type InventoryItemUpdate = Updateable<InventoryItemsTable>;

export type InventoryMovement = Selectable<InventoryMovementsTable>;
export type NewInventoryMovement = Insertable<InventoryMovementsTable>;

export type FinancialTransaction = Selectable<FinancialTransactionsTable>;
export type NewFinancialTransaction = Insertable<FinancialTransactionsTable>;

export type PatientMedicalRecord = Selectable<PatientMedicalRecordsTable>;
export type NewPatientMedicalRecord = Insertable<PatientMedicalRecordsTable>;

export type PatientRecordAttachment = Selectable<PatientRecordAttachmentsTable>;
export type NewPatientRecordAttachment = Insertable<PatientRecordAttachmentsTable>;

export type Prescription = Selectable<PrescriptionsTable>;
export type NewPrescription = Insertable<PrescriptionsTable>;
export type PrescriptionUpdate = Updateable<PrescriptionsTable>;

export type LabOrder = Selectable<LabOrdersTable>;
export type NewLabOrder = Insertable<LabOrdersTable>;
export type LabOrderUpdate = Updateable<LabOrdersTable>;
export type LabResult = Selectable<LabResultsTable>;
export type NewLabResult = Insertable<LabResultsTable>;
export type VisitTemplate = Selectable<VisitTemplatesTable>;
export type NewVisitTemplate = Insertable<VisitTemplatesTable>;
export type VisitTemplateUpdate = Updateable<VisitTemplatesTable>;
export type VisitTemplateUse = Selectable<VisitTemplateUsesTable>;
export type ClinicalAlert = Selectable<PatientClinicalAlertsTable>;
export type NewClinicalAlert = Insertable<PatientClinicalAlertsTable>;
export type ClinicalAlertUpdate = Updateable<PatientClinicalAlertsTable>;