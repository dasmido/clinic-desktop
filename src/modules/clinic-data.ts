export type Patient = {
  id: number;
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  notes: string;
  created_at: string;
};

export type AppointmentStatus = 'scheduled' | 'arrived' | 'completed' | 'cancelled';

export type Appointment = {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  patient_name: string;
  patient_phone: string;
  doctor_name: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string;
};

export type Doctor = {
  id: number;
  user_id: number;
  display_name: string;
};

export type DoctorAvailability = {
  id: number;
  doctor_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

export type InventoryItem = {
  id: number;
  name: string;
  sku: string | null;
  unit: string;
  quantity: string;
  reorder_level: string;
  unit_cost: string;
  created_at: string;
};

export type FinancialTransactionType = 'income' | 'expense';

export type FinancialTransaction = {
  id: number;
  transaction_type: FinancialTransactionType;
  category: string;
  description: string;
  amount: string;
  occurred_on: string;
  created_at: string;
};

export type FinanceSummary = {
  income: string;
  expenses: string;
};

export type MedicalRecord = {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  doctor_name: string | null;
  recorded_by_user_id: number | null;
  recorded_by_name: string | null;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  clinical_notes: string;
  blood_pressure: string;
  temperature_celsius: string | null;
  weight_kg: string | null;
  created_at: string;
};

export type MedicalRecordAttachment = {
  id: number;
  medical_record_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_size_bytes: string;
  created_at: string;
};

export type PrescriptionStatus = 'active' | 'fulfilled' | 'cancelled';

export type Prescription = {
  id: number;
  medical_record_id: number;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  prescribed_by_user_id: number;
  prescribed_by_name: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number | null;
  notes: string;
  status: PrescriptionStatus;
  prescribed_on: string;
  created_at: string;
};

export type LabOrderUrgency = 'routine' | 'urgent';
export type LabOrderStatus = 'pending' | 'resulted' | 'cancelled';
export type LabResultInterpretation = '' | 'normal' | 'low' | 'high' | 'critical';

export type LabOrder = {
  id: number;
  medical_record_id: number;
  patient_id: number;
  patient_name: string;
  ordered_by_user_id: number;
  ordered_by_name: string;
  test_name: string;
  urgency: LabOrderUrgency;
  clinical_indication: string;
  result_status: LabOrderStatus;
  ordered_on: string;
  created_at: string;
};

export type LabResult = {
  id: number;
  lab_order_id: number;
  patient_id: number;
  test_name: string;
  result_value: string;
  reference_range: string;
  interpretation: LabResultInterpretation;
  notes: string;
  recorded_by_user_id: number;
  recorded_by_name: string;
  recorded_on: string;
  created_at: string;
};

export type VisitTemplateSection = { key: string; label: string; type: 'text' | 'vitals' };
export type VisitTemplateData = { sections: VisitTemplateSection[] };

export type VisitTemplate = {
  id: number;
  name: string;
  visit_type: string;
  description: string;
  created_by_user_id: number;
  template_data: VisitTemplateData;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClinicalAlertType = 'allergy' | 'contraindication' | 'critical_value' | 'follow_up_due';
export type ClinicalAlertSeverity = 'info' | 'warning' | 'critical';

export type ClinicalAlert = {
  id: number;
  patient_id: number;
  related_medical_record_id: number | null;
  alert_type: ClinicalAlertType;
  title: string;
  description: string;
  severity: ClinicalAlertSeverity;
  dismissible: boolean;
  is_active: boolean;
  created_by_user_id: number;
  created_at: string;
  dismissed_at: string | null;
};