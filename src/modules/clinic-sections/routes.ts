import type { RouteRecordRaw } from 'vue-router'
import AppointmentsView from './views/AppointmentsView.vue'
import AppointmentCreateView from './views/AppointmentCreateView.vue'
import ClinicalWorkflowView from './views/ClinicalWorkflowView.vue'
import FinanceView from './views/FinanceView.vue'
import FinanceTransactionCreateView from './views/FinanceTransactionCreateView.vue'
import LabsView from './views/LabsView.vue'
import LabOrderCreateView from './views/LabOrderCreateView.vue'
import PatientRecordsView from './views/PatientRecordsView.vue'
import MedicalRecordCreateView from './views/MedicalRecordCreateView.vue'
import PatientCreateView from './views/PatientCreateView.vue'
import PatientsView from './views/PatientsView.vue'
import PrescriptionsView from './views/PrescriptionsView.vue'
import PrescriptionCreateView from './views/PrescriptionCreateView.vue'
import InventoryItemCreateView from './views/InventoryItemCreateView.vue'

export const clinicSectionRoutes: RouteRecordRaw[] = [
  {
    path: '/patients',
    component: PatientsView
  },
  {
    path: '/patients/new',
    component: PatientCreateView
  },
  {
    path: '/medical-records',
    component: ClinicalWorkflowView
  },
  {
    path: '/appointments/new',
    component: AppointmentCreateView
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
    path: '/prescriptions/new',
    component: PrescriptionCreateView
  },
  {
    path: '/labs',
    component: LabsView
  },
  {
    path: '/labs/new',
    component: LabOrderCreateView
  },
  {
    path: '/finance/transactions/new',
    component: FinanceTransactionCreateView
  },
  {
    path: '/finance/inventory/new',
    component: InventoryItemCreateView
  },
  {
    path: '/patients/:patientId/records',
    component: PatientRecordsView
  },
  {
    path: '/patients/:patientId/records/new',
    component: MedicalRecordCreateView
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