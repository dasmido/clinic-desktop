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

export async function databaseQuery<Row>(text: string, values: unknown[] = []): Promise<Row[]> {
  const result = await window.electronAPI.database.query(text, values);
  return result.rows as Row[];
}