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

export async function databaseQuery<Row>(text: string, values: unknown[] = []): Promise<Row[]> {
  const result = await window.electronAPI.database.query(text, values);
  return result.rows as Row[];
}