export interface DashboardKpi {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  state: 'Positive' | 'Negative' | 'Critical' | 'Neutral';
  icon: string;
}

export interface UpcomingAppointment {
  id: string;
  patient: string;
  time: string;
  doctor: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}
