import type { DashboardKpi, UpcomingAppointment } from './dashboard.model';

// Mock data source for the dashboard — replace with a real API/service later.
const kpis: DashboardKpi[] = [
  { key: 'patients', title: 'المرضى اليوم', value: '24', subtitle: '+3 مقارنة بالأمس', state: 'Positive', icon: 'employee' },
  { key: 'appointments', title: 'المواعيد', value: '18', subtitle: '5 قيد الانتظار', state: 'Critical', icon: 'appointment-2' },
  { key: 'revenue', title: 'إيرادات اليوم', value: '3,240 $', subtitle: '+12% عن المعدل', state: 'Positive', icon: 'sales-order' },
  { key: 'cancellations', title: 'الإلغاءات', value: '2', subtitle: '-1 مقارنة بالأمس', state: 'Positive', icon: 'cancel' },
];

const upcomingAppointments: UpcomingAppointment[] = [
  { id: '1', patient: 'سارة جونسون', time: '09:30', doctor: 'د. أمير خان', status: 'Confirmed' },
  { id: '2', patient: 'مايكل لي', time: '10:00', doctor: 'د. أمير خان', status: 'Pending' },
  { id: '3', patient: 'إيلينا بيتروفا', time: '10:30', doctor: 'د. ليزا وونغ', status: 'Confirmed' },
  { id: '4', patient: 'جيمس كارتر', time: '11:15', doctor: 'د. ليزا وونغ', status: 'Cancelled' },
];

export const dashboardService = {
  kpis,
  upcomingAppointments,
};
