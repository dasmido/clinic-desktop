import type { RouteRecordRaw } from 'vue-router'
import AppointmentsView from './views/AppointmentsView.vue'
import ClinicalWorkflowView from './views/ClinicalWorkflowView.vue'
import FinanceView from './views/FinanceView.vue'
import LabsView from './views/LabsView.vue'
import PatientRecordsView from './views/PatientRecordsView.vue'
import PatientsView from './views/PatientsView.vue'
import PrescriptionsView from './views/PrescriptionsView.vue'

export const clinicSectionRoutes: RouteRecordRaw[] = [
  {
    path: '/patients',
    component: PatientsView
  },
  {
    path: '/medical-records',
    component: ClinicalWorkflowView
  },
  {
    path: '/clinical-workspace',
    component: ClinicalWorkflowView
  },
  {
    path: '/prescriptions',
    component: PrescriptionsView
  },
  {
    path: '/labs',
    component: LabsView
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