<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/modules/auth'
import type { ClinicalAlert, LabOrder, LabResult, MedicalRecord, Patient, Prescription, VisitTemplate } from '@/modules/clinic-data'

const { currentUser } = useAuth()
const patients = ref<Patient[]>([])
const records = ref<MedicalRecord[]>([])
const alerts = ref<ClinicalAlert[]>([])
const prescriptions = ref<Prescription[]>([])
const labOrders = ref<LabOrder[]>([])
const labResults = ref<LabResult[]>([])
const templates = ref<VisitTemplate[]>([])
const patientId = ref('')
const recordId = ref('')
const selectedLabOrderId = ref<number | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const prescriptionForm = ref({ medicineName: '', dosage: '', frequency: '', durationDays: '', notes: '' })
const labOrderForm = ref({ testName: '', urgency: 'routine' as 'routine' | 'urgent', indication: '' })
const labResultForm = ref({ testName: '', value: '', referenceRange: '', interpretation: '' as LabResult['interpretation'], notes: '' })
const alertForm = ref({ type: 'allergy' as ClinicalAlert['alert_type'], title: '', description: '', severity: 'warning' as ClinicalAlert['severity'], dismissible: false })

const role = computed(() => currentUser.value?.role)
const canPrescribe = computed(() => role.value === 'doctor' || role.value === 'admin')
const canOrderLabs = computed(() => canPrescribe.value || role.value === 'nurse')
const canRecordResults = computed(() => role.value === 'lab' || role.value === 'admin')
const canManageAlerts = computed(() => canOrderLabs.value)
const patientItems = computed(() => patients.value.map((patient) => ({ label: `${patient.full_name} - ${patient.phone}`, value: String(patient.id) })))
const recordItems = computed(() => records.value.map((record) => ({ label: `${new Date(record.visit_date).toLocaleDateString('ar-SA')} - ${record.diagnosis || 'زيارة طبية'}`, value: String(record.id) })))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function printPrescriptions() {
  window.print()
}

async function loadPatients() {
  patients.value = await window.electronAPI.patients.list()
}

async function loadPatientData() {
  const selectedPatientId = Number(patientId.value)
  records.value = []
  alerts.value = []
  prescriptions.value = []
  labOrders.value = []
  recordId.value = ''
  selectedLabOrderId.value = null
  labResults.value = []
  if (!selectedPatientId) return

  const [medicalData, alertRows, prescriptionRows, orderRows] = await Promise.all([
    window.electronAPI.medicalRecords.listByPatient(selectedPatientId),
    window.electronAPI.clinicalAlerts.listActive(selectedPatientId),
    window.electronAPI.prescriptions.listByPatient(selectedPatientId),
    window.electronAPI.labs.listByPatient(selectedPatientId),
  ])
  records.value = medicalData.records
  alerts.value = alertRows
  prescriptions.value = prescriptionRows
  labOrders.value = orderRows
}

async function refresh() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await loadPatientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل البيانات السريرية.'
  } finally {
    isLoading.value = false
  }
}

async function createPrescription() {
  if (!recordId.value || !prescriptionForm.value.medicineName.trim()) return
  isLoading.value = true
  try {
    await window.electronAPI.prescriptions.create({
      medical_record_id: Number(recordId.value), patient_id: Number(patientId.value), medicine_name: prescriptionForm.value.medicineName.trim(),
      dosage: prescriptionForm.value.dosage.trim(), frequency: prescriptionForm.value.frequency.trim(),
      duration_days: prescriptionForm.value.durationDays ? Number(prescriptionForm.value.durationDays) : null, notes: prescriptionForm.value.notes.trim(),
    })
    prescriptionForm.value = { medicineName: '', dosage: '', frequency: '', durationDays: '', notes: '' }
    await refresh()
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الوصفة.' } finally { isLoading.value = false }
}

async function createLabOrder() {
  if (!recordId.value || !labOrderForm.value.testName.trim()) return
  isLoading.value = true
  try {
    await window.electronAPI.labs.createOrder({ medical_record_id: Number(recordId.value), patient_id: Number(patientId.value), test_name: labOrderForm.value.testName.trim(), urgency: labOrderForm.value.urgency, clinical_indication: labOrderForm.value.indication.trim() })
    labOrderForm.value = { testName: '', urgency: 'routine', indication: '' }
    await refresh()
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر طلب الفحص.' } finally { isLoading.value = false }
}

async function selectLabOrder(orderId: number) {
  selectedLabOrderId.value = orderId
  labResults.value = await window.electronAPI.labs.listResultsByOrder(orderId)
}

async function createLabResult() {
  if (!selectedLabOrderId.value || !labResultForm.value.testName.trim() || !labResultForm.value.value.trim()) return
  isLoading.value = true
  try {
    await window.electronAPI.labs.createResult(selectedLabOrderId.value, { patient_id: Number(patientId.value), test_name: labResultForm.value.testName.trim(), result_value: labResultForm.value.value.trim(), reference_range: labResultForm.value.referenceRange.trim(), interpretation: labResultForm.value.interpretation, notes: labResultForm.value.notes.trim() })
    labResultForm.value = { testName: '', value: '', referenceRange: '', interpretation: '', notes: '' }
    await selectLabOrder(selectedLabOrderId.value)
    await refresh()
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر تسجيل النتيجة.' } finally { isLoading.value = false }
}

async function createAlert() {
  if (!alertForm.value.title.trim()) return
  isLoading.value = true
  try {
    await window.electronAPI.clinicalAlerts.create({ patient_id: Number(patientId.value), related_medical_record_id: recordId.value ? Number(recordId.value) : null, alert_type: alertForm.value.type, title: alertForm.value.title.trim(), description: alertForm.value.description.trim(), severity: alertForm.value.severity, dismissible: alertForm.value.dismissible })
    alertForm.value = { type: 'allergy', title: '', description: '', severity: 'warning', dismissible: false }
    await refresh()
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ التنبيه.' } finally { isLoading.value = false }
}

async function dismissAlert(alertId: number) {
  try { await window.electronAPI.clinicalAlerts.dismiss(alertId); await refresh() } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر إغلاق التنبيه.' }
}

watch(patientId, refresh)
onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([loadPatients(), window.electronAPI.visitTemplates.list().then((rows) => { templates.value = rows })])
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل مساحة العمل السريرية.' } finally { isLoading.value = false }
})
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="border-b border-default pb-5"><p class="text-sm font-medium text-primary">الرعاية السريرية</p><h1 class="mt-1 text-2xl font-bold text-highlighted">مساحة العمل السريري</h1><p class="mt-1 text-sm text-muted">إدارة تنبيهات المراجع والوصفات والفحوصات من زيارة موثقة.</p></header>
    <div class="grid gap-3 sm:grid-cols-2"><UFormField label="المراجع"><USelect v-model="patientId" :items="patientItems" placeholder="اختر مراجعاً" class="w-full" /></UFormField><UFormField label="الزيارة"><USelect v-model="recordId" :items="recordItems" placeholder="اختر زيارة موثقة" class="w-full" :disabled="!patientId" /></UFormField></div>
    <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
    <div v-if="patientId" class="space-y-6">
      <section class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between gap-3"><h2 class="font-semibold text-highlighted">تنبيهات السلامة</h2><UBadge :label="String(alerts.length)" color="error" variant="subtle" /></div><div v-if="alerts.length" class="mt-4 grid gap-3 sm:grid-cols-2"><article v-for="alert in alerts" :key="alert.id" class="border-s-4 border-error bg-error/5 p-3"><div class="flex items-start justify-between gap-2"><div><p class="font-semibold text-highlighted">{{ alert.title }}</p><p class="mt-1 text-sm text-toned">{{ alert.description }}</p></div><UButton v-if="alert.dismissible && canManageAlerts" icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="إغلاق التنبيه" @click="dismissAlert(alert.id)" /></div></article></div><p v-else class="mt-3 text-sm text-muted">لا توجد تنبيهات فعالة لهذا المراجع.</p><form v-if="canManageAlerts" class="mt-5 grid gap-3 border-t border-default pt-4 sm:grid-cols-2" @submit.prevent="createAlert"><UInput v-model="alertForm.title" placeholder="عنوان التنبيه" /><USelect v-model="alertForm.type" :items="[{ label: 'حساسية', value: 'allergy' }, { label: 'مانع علاجي', value: 'contraindication' }, { label: 'قيمة حرجة', value: 'critical_value' }, { label: 'متابعة مطلوبة', value: 'follow_up_due' }]" /><UTextarea v-model="alertForm.description" class="sm:col-span-2" placeholder="تفاصيل التنبيه" /><div class="flex items-center gap-3"><USelect v-model="alertForm.severity" :items="[{ label: 'معلومة', value: 'info' }, { label: 'تحذير', value: 'warning' }, { label: 'حرج', value: 'critical' }]" /><UCheckbox v-model="alertForm.dismissible" label="يسمح بالإغلاق" /></div><UButton type="submit" icon="i-lucide-shield-alert" label="إضافة تنبيه" :disabled="!alertForm.title.trim()" /></form></section>
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><h2 class="font-semibold text-highlighted">الوصفات الطبية</h2><UButton icon="i-lucide-printer" color="neutral" variant="ghost" aria-label="طباعة الوصفات" :disabled="!prescriptions.length" @click="printPrescriptions" /></div><div class="mt-4 divide-y divide-default"><div v-for="item in prescriptions" :key="item.id" class="py-3"><p class="font-medium text-highlighted">{{ item.medicine_name }} <span class="text-sm text-muted">{{ item.dosage }} · {{ item.frequency }}</span></p><p class="mt-1 text-xs text-muted">وصفها {{ item.prescribed_by_name }} · {{ formatDate(item.prescribed_on) }}</p></div><p v-if="!prescriptions.length" class="py-4 text-sm text-muted">لا توجد وصفات مسجلة.</p></div><form v-if="canPrescribe" class="mt-4 grid gap-3 border-t border-default pt-4 sm:grid-cols-2" @submit.prevent="createPrescription"><UInput v-model="prescriptionForm.medicineName" placeholder="اسم الدواء" /><UInput v-model="prescriptionForm.dosage" placeholder="الجرعة" /><UInput v-model="prescriptionForm.frequency" placeholder="التكرار" /><UInput v-model="prescriptionForm.durationDays" type="number" min="1" placeholder="المدة بالأيام" /><UTextarea v-model="prescriptionForm.notes" class="sm:col-span-2" placeholder="تعليمات إضافية" /><UButton type="submit" icon="i-lucide-pill" label="إضافة وصفة" :disabled="!recordId || !prescriptionForm.medicineName.trim()" /></form></section>
        <section class="border border-default bg-default p-5 shadow-sm"><h2 class="font-semibold text-highlighted">طلبات المختبر</h2><div class="mt-4 space-y-2"><button v-for="order in labOrders" :key="order.id" type="button" class="w-full border border-default p-3 text-right" :class="selectedLabOrderId === order.id ? 'bg-elevated' : ''" @click="selectLabOrder(order.id)"><div class="flex justify-between gap-3"><span class="font-medium text-highlighted">{{ order.test_name }}</span><UBadge :label="order.result_status === 'pending' ? 'قيد الانتظار' : 'ظهرت النتيجة'" :color="order.result_status === 'pending' ? 'warning' : 'success'" variant="subtle" /></div><p class="mt-1 text-xs text-muted">{{ order.urgency === 'urgent' ? 'عاجل' : 'روتيني' }} · {{ order.ordered_by_name }}</p></button><p v-if="!labOrders.length" class="py-4 text-sm text-muted">لا توجد طلبات مختبر.</p></div><form v-if="canOrderLabs" class="mt-4 grid gap-3 border-t border-default pt-4" @submit.prevent="createLabOrder"><UInput v-model="labOrderForm.testName" placeholder="اسم الفحص" /><USelect v-model="labOrderForm.urgency" :items="[{ label: 'روتيني', value: 'routine' }, { label: 'عاجل', value: 'urgent' }]" /><UTextarea v-model="labOrderForm.indication" placeholder="السبب السريري" /><UButton type="submit" icon="i-lucide-flask-conical" label="طلب فحص" :disabled="!recordId || !labOrderForm.testName.trim()" /></form></section>
      </div>
      <section v-if="selectedLabOrderId" class="border border-default bg-default p-5 shadow-sm"><h2 class="font-semibold text-highlighted">نتائج الفحص</h2><div class="mt-3 divide-y divide-default"><div v-for="result in labResults" :key="result.id" class="py-3"><p class="font-medium text-highlighted">{{ result.test_name }}: {{ result.result_value }}</p><p class="mt-1 text-xs text-muted">{{ result.reference_range || 'لا يوجد مدى مرجعي' }} · {{ result.recorded_by_name }}</p></div><p v-if="!labResults.length" class="py-3 text-sm text-muted">لم تسجل نتائج بعد.</p></div><form v-if="canRecordResults" class="mt-4 grid gap-3 border-t border-default pt-4 sm:grid-cols-2" @submit.prevent="createLabResult"><UInput v-model="labResultForm.testName" placeholder="اسم التحليل" /><UInput v-model="labResultForm.value" placeholder="النتيجة" /><UInput v-model="labResultForm.referenceRange" placeholder="المدى المرجعي" /><USelect v-model="labResultForm.interpretation" :items="[{ label: 'غير محدد', value: '' }, { label: 'طبيعي', value: 'normal' }, { label: 'منخفض', value: 'low' }, { label: 'مرتفع', value: 'high' }, { label: 'حرج', value: 'critical' }]" /><UTextarea v-model="labResultForm.notes" class="sm:col-span-2" placeholder="ملاحظات" /><UButton type="submit" icon="i-lucide-clipboard-check" label="تسجيل نتيجة" :disabled="!labResultForm.testName.trim() || !labResultForm.value.trim()" /></form></section>
      <section class="border border-default bg-default p-5 shadow-sm"><h2 class="font-semibold text-highlighted">قوالب الزيارة المتاحة</h2><div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div v-for="template in templates" :key="template.id" class="border border-default p-3"><p class="font-medium text-highlighted">{{ template.name }}</p><p class="mt-1 text-sm text-muted">{{ template.visit_type }}</p><p v-if="template.description" class="mt-2 text-xs text-toned">{{ template.description }}</p></div><p v-if="!templates.length" class="text-sm text-muted">لا توجد قوالب فعالة بعد.</p></div></section>
    </div>
    <div v-else-if="!isLoading" class="border border-dashed border-default p-10 text-center text-sm text-muted">اختر مراجعاً لبدء التوثيق السريري.</div>
  </section>
</template>