import type { RouteRecordRaw } from 'vue-router'
import AppointmentsView from './views/AppointmentsView.vue'
import FinanceView from './views/FinanceView.vue'
import PatientRecordsView from './views/PatientRecordsView.vue'
import PatientsView from './views/PatientsView.vue'

export const clinicSectionRoutes: RouteRecordRaw[] = [
  {
    path: '/patients',
    component: PatientsView
  },
  {
    path: '/patients/:patientId/records',
    component: PatientRecordsView
  },
  {
    path: '/appointments',
    component: AppointmentsView
  },
  {
    path: '/finance',
    component: FinanceView
  }
]