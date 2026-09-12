export {};

import type {
  Appointment,
  AppointmentStatus,
  Doctor,
  DoctorAvailability,
  FinanceSummary,
  FinancialTransaction,
  FinancialTransactionType,
  InventoryItem,
  MedicalRecord,
  MedicalRecordAttachment,
  Patient,
  ClinicalAlert,
  ClinicalAlertSeverity,
  ClinicalAlertType,
  LabOrder,
  LabOrderStatus,
  LabOrderUrgency,
  LabResult,
  LabResultInterpretation,
  Prescription,
  PrescriptionStatus,
  VisitTemplate,
  VisitTemplateData,
} from './modules/clinic-data';

type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
};

type UserRole = 'doctor' | 'nurse' | 'lab' | 'pharmacy' | 'moderator' | 'admin';

type PatientFileUpload = {
  originalName: string;
  storedName: string;
  fileSizeBytes: number;
};

type PatientInput = {
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  notes: string;
};

type AppointmentInput = {
  patient_id?: number;
  doctor_id?: number | null;
  starts_at?: string;
  ends_at?: string;
  status?: AppointmentStatus;
  notes?: string;
};

type InventoryItemInput = {
  name: string;
  sku: string | null;
  unit: string;
  quantity?: number;
  reorder_level: number;
  unit_cost: number;
};

type TransactionInput = {
  transaction_type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  occurred_on: string;
};

type MedicalRecordInput = {
  patient_id: number;
  doctor_id: number | null;
  recorded_by_user_id: number | null;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  clinical_notes: string;
  blood_pressure: string;
  temperature_celsius: number | null;
  weight_kg: number | null;
};

type AttachmentInput = {
  medical_record_id: number;
  original_name: string;
  stored_name: string;
  file_size_bytes: number;
};

type PrescriptionInput = {
  medical_record_id: number;
  patient_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number | null;
  notes: string;
  status?: PrescriptionStatus;
};

type LabOrderInput = {
  medical_record_id: number;
  patient_id: number;
  test_name: string;
  urgency: LabOrderUrgency;
  clinical_indication: string;
};

type LabResultInput = {
  patient_id: number;
  test_name: string;
  result_value: string;
  reference_range: string;
  interpretation: LabResultInterpretation;
  notes: string;
};

type VisitTemplateInput = {
  name: string;
  visit_type: string;
  description: string;
  template_data: VisitTemplateData;
};

type ClinicalAlertInput = {
  patient_id: number;
  related_medical_record_id: number | null;
  alert_type: ClinicalAlertType;
  title: string;
  description: string;
  severity: ClinicalAlertSeverity;
  dismissible: boolean;
};

declare global {
  interface Window {
    electronAPI: {
      database: {
        isReady(): Promise<boolean>;
      };
      auth: {
        hasUsers(): Promise<boolean>;
        register(username: string, password: string): Promise<AuthUser>;
        login(username: string, password: string): Promise<AuthUser>;
        logout(): Promise<boolean>;
        getCurrentUser(): Promise<AuthUser | null>;
        createUser(username: string, password: string, role: UserRole): Promise<AuthUser>;
        listUsers(): Promise<AuthUser[]>;
        deleteUser(userId: number): Promise<boolean>;
      };
      patients: {
        list(search?: string): Promise<Patient[]>;
        create(input: PatientInput): Promise<Patient>;
        update(patientId: number, input: Partial<PatientInput>): Promise<Patient | undefined>;
        delete(patientId: number): Promise<boolean>;
      };
      appointments: {
        listForRange(from: string, to: string): Promise<Appointment[]>;
        create(input: AppointmentInput): Promise<Appointment>;
        update(appointmentId: number, input: AppointmentInput): Promise<Appointment | undefined>;
        delete(appointmentId: number): Promise<boolean>;
      };
      doctors: {
        list(): Promise<Doctor[]>;
        createProfile(userId: number, displayName: string): Promise<boolean>;
        delete(doctorId: number): Promise<boolean>;
        listAvailability(doctorId: number): Promise<DoctorAvailability[]>;
        addAvailability(doctorId: number, dayOfWeek: number, startsAt: string, endsAt: string): Promise<boolean>;
        removeAvailability(availabilityId: number): Promise<boolean>;
      };
      inventory: {
        list(): Promise<InventoryItem[]>;
        createItem(input: InventoryItemInput): Promise<InventoryItem>;
        updateItem(itemId: number, input: InventoryItemInput): Promise<InventoryItem | undefined>;
        deleteItem(itemId: number): Promise<boolean>;
        adjustQuantity(itemId: number, quantityChange: number, reason: string, notes?: string): Promise<InventoryItem>;
      };
      finance: {
        getSummary(monthStart: string): Promise<FinanceSummary>;
        listTransactions(limit?: number): Promise<FinancialTransaction[]>;
        createTransaction(input: TransactionInput): Promise<FinancialTransaction>;
        deleteTransaction(transactionId: number): Promise<boolean>;
      };
      medicalRecords: {
        listByPatient(patientId: number): Promise<{ records: MedicalRecord[]; attachments: MedicalRecordAttachment[] }>;
        create(input: MedicalRecordInput): Promise<MedicalRecord>;
        update(recordId: number, input: Omit<MedicalRecordInput, 'patient_id' | 'recorded_by_user_id'>): Promise<MedicalRecord>;
        delete(recordId: number): Promise<boolean>;
        addAttachment(input: AttachmentInput): Promise<MedicalRecordAttachment>;
        deleteAttachment(attachmentId: number): Promise<boolean>;
      };
      prescriptions: {
        listAll(): Promise<(Prescription & { patient_name?: string; patient_phone?: string })[]>;
        listByPatient(patientId: number): Promise<Prescription[]>;
        listByMedicalRecord(medicalRecordId: number): Promise<Prescription[]>;
        create(input: PrescriptionInput): Promise<Prescription>;
        update(prescriptionId: number, input: Omit<PrescriptionInput, 'medical_record_id' | 'patient_id'>): Promise<Prescription>;
        updateStatus(prescriptionId: number, status: PrescriptionStatus): Promise<Prescription>;
        delete(prescriptionId: number): Promise<boolean>;
      };
      labs: {
        listByPatient(patientId: number): Promise<LabOrder[]>;
        listOpenOrders(): Promise<LabOrder[]>;
        listResultsByOrder(orderId: number): Promise<LabResult[]>;
        createOrder(input: LabOrderInput): Promise<LabOrder>;
        createResult(orderId: number, input: LabResultInput): Promise<LabResult>;
        updateStatus(orderId: number, status: LabOrderStatus): Promise<LabOrder>;
        deleteOrder(orderId: number): Promise<boolean>;
      };
      visitTemplates: {
        list(includeInactive?: boolean): Promise<VisitTemplate[]>;
        create(input: VisitTemplateInput): Promise<VisitTemplate>;
        update(templateId: number, input: VisitTemplateInput): Promise<VisitTemplate>;
        deactivate(templateId: number): Promise<VisitTemplate>;
      };
      clinicalAlerts: {
        listActive(patientId: number): Promise<ClinicalAlert[]>;
        create(input: ClinicalAlertInput): Promise<ClinicalAlert>;
        dismiss(alertId: number): Promise<ClinicalAlert>;
        deactivate(alertId: number): Promise<ClinicalAlert>;
      };
      patientFiles: {
        add(medicalRecordId: number): Promise<PatientFileUpload[]>;
        open(medicalRecordId: number, storedName: string): Promise<void>;
        delete(medicalRecordId: number, storedName: string): Promise<void>;
        deleteRecord(medicalRecordId: number): Promise<void>;
      };
    };
  }
}