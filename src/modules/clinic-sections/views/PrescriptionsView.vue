<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/modules/auth'
import type { MedicalRecord, Patient, Prescription, PrescriptionStatus } from '@/modules/clinic-data'

const { currentUser } = useAuth()
const patients = ref<Patient[]>([])
const records = ref<MedicalRecord[]>([])
const prescriptions = ref<Prescription[]>([])
const patientId = ref('')
const recordId = ref('')
const editingId = ref<number | null>(null)
const isModalOpen = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const printTarget = ref<Prescription | null>(null)
const form = ref({ medicineName: '', dosage: '', frequency: '', durationDays: '', notes: '', status: 'active' as PrescriptionStatus })

const canManage = computed(() => currentUser.value?.role === 'doctor' || currentUser.value?.role === 'admin')
const selectedPatient = computed(() => patients.value.find((patient) => patient.id === Number(patientId.value)) ?? null)
const patientItems = computed(() => patients.value.map((patient) => ({ label: `${patient.full_name} - ${patient.phone}`, value: String(patient.id) })))
const recordItems = computed(() => records.value.map((record) => ({ label: new Date(record.visit_date).toLocaleDateString('ar-SA'), value: String(record.id) })))
const statusItems = [{ label: 'نشطة', value: 'active' }, { label: 'تم الصرف', value: 'fulfilled' }, { label: 'ملغاة', value: 'cancelled' }]

function formatDate(value: string) { return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date(value)) }
function resetForm() { form.value = { medicineName: '', dosage: '', frequency: '', durationDays: '', notes: '', status: 'active' } }

async function loadPatientData() {
  const id = Number(patientId.value)
  records.value = []
  prescriptions.value = []
  recordId.value = ''
  if (!id) return
  const [medicalData, prescriptionRows] = await Promise.all([window.electronAPI.medicalRecords.listByPatient(id), window.electronAPI.prescriptions.listByPatient(id)])
  records.value = medicalData.records
  prescriptions.value = prescriptionRows
}

async function refresh() {
  isLoading.value = true
  errorMessage.value = ''
  try { await loadPatientData() } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل الوصفات.' } finally { isLoading.value = false }
}

function openCreate() { editingId.value = null; resetForm(); isModalOpen.value = true }
function openEdit(prescription: Prescription) {
  editingId.value = prescription.id
  form.value = { medicineName: prescription.medicine_name, dosage: prescription.dosage, frequency: prescription.frequency, durationDays: prescription.duration_days ? String(prescription.duration_days) : '', notes: prescription.notes, status: prescription.status }
  isModalOpen.value = true
}

async function savePrescription() {
  if (!form.value.medicineName.trim()) return
  isLoading.value = true
  try {
    const input = { medicine_name: form.value.medicineName.trim(), dosage: form.value.dosage.trim(), frequency: form.value.frequency.trim(), duration_days: form.value.durationDays ? Number(form.value.durationDays) : null, notes: form.value.notes.trim(), status: form.value.status }
    if (editingId.value) await window.electronAPI.prescriptions.update(editingId.value, input)
    else await window.electronAPI.prescriptions.create({ ...input, medical_record_id: Number(recordId.value), patient_id: Number(patientId.value) })
    isModalOpen.value = false
    await refresh()
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الوصفة.' } finally { isLoading.value = false }
}

async function deletePrescription(prescription: Prescription) {
  if (!window.confirm(`حذف وصفة ${prescription.medicine_name}؟`)) return
  try { await window.electronAPI.prescriptions.delete(prescription.id); await refresh() } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف الوصفة.' }
}

function printPrescription(prescription: Prescription) { printTarget.value = prescription; setTimeout(() => window.print(), 0) }

watch(patientId, refresh)
onMounted(async () => {
  try { patients.value = await window.electronAPI.patients.list() } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل المراجعين.' }
})
</script>

<template>
  <section class="prescription-page mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-3 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-sm font-medium text-primary">الصيدلية السريرية</p><h1 class="mt-1 text-2xl font-bold text-highlighted">الوصفات الطبية</h1><p class="mt-1 text-sm text-muted">أنشئ وعدل واطبع الوصفات المرتبطة بزيارة موثقة.</p></div><UButton v-if="canManage" icon="i-lucide-plus" label="وصفة جديدة" :disabled="!recordId" @click="openCreate" /></header>
    <div class="grid gap-3 sm:grid-cols-2"><UFormField label="المراجع"><USelect v-model="patientId" :items="patientItems" placeholder="اختر مراجعاً" class="w-full" /></UFormField><UFormField label="الزيارة (مطلوبة للوصفة الجديدة)"><USelect v-model="recordId" :items="recordItems" placeholder="اختر زيارة" class="w-full" :disabled="!patientId" /></UFormField></div>
    <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
    <div v-if="isLoading" class="flex min-h-24 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div>
    <div v-else-if="patientId && !prescriptions.length" class="border border-dashed border-default p-10 text-center text-sm text-muted">لا توجد وصفات لهذا المراجع.</div>
    <div v-else-if="prescriptions.length" class="grid gap-4 md:grid-cols-2"><article v-for="item in prescriptions" :key="item.id" class="border border-default bg-default p-5 shadow-sm"><div class="flex items-start justify-between gap-3"><div><h2 class="font-semibold text-highlighted">{{ item.medicine_name }}</h2><p class="mt-1 text-sm text-toned">{{ item.dosage }} · {{ item.frequency }}</p></div><UBadge :label="statusItems.find((status) => status.value === item.status)?.label" :color="item.status === 'active' ? 'primary' : item.status === 'fulfilled' ? 'success' : 'neutral'" variant="subtle" /></div><dl class="mt-4 space-y-2 text-sm"><div class="flex justify-between gap-4"><dt class="text-muted">المدة</dt><dd class="text-highlighted">{{ item.duration_days ? `${item.duration_days} أيام` : 'غير محددة' }}</dd></div><div v-if="item.notes"><dt class="text-muted">تعليمات</dt><dd class="mt-1 whitespace-pre-wrap text-highlighted">{{ item.notes }}</dd></div></dl><div class="mt-5 flex flex-wrap gap-2 border-t border-default pt-3"><UButton icon="i-lucide-printer" color="neutral" variant="outline" label="طباعة" @click="printPrescription(item)" /><UButton v-if="canManage" icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="تعديل الوصفة" @click="openEdit(item)" /><UButton v-if="canManage" icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف الوصفة" @click="deletePrescription(item)" /></div></article></div>
    <UModal v-model:open="isModalOpen" :title="editingId ? 'تعديل وصفة طبية' : 'وصفة طبية جديدة'"><template #body><form class="grid gap-4 sm:grid-cols-2" @submit.prevent="savePrescription"><UFormField label="اسم الدواء" required><UInput v-model="form.medicineName" autofocus /></UFormField><UFormField label="الجرعة" required><UInput v-model="form.dosage" /></UFormField><UFormField label="التكرار" required><UInput v-model="form.frequency" placeholder="مثال: مرتين يومياً" /></UFormField><UFormField label="المدة بالأيام"><UInput v-model="form.durationDays" type="number" min="1" /></UFormField><UFormField label="الحالة"><USelect v-model="form.status" :items="statusItems" /></UFormField><UFormField label="تعليمات إضافية" class="sm:col-span-2"><UTextarea v-model="form.notes" :rows="3" /></UFormField><div class="flex justify-end gap-2 sm:col-span-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" /><UButton type="submit" icon="i-lucide-save" label="حفظ الوصفة" :loading="isLoading" :disabled="!form.medicineName.trim() || !form.dosage.trim() || !form.frequency.trim()" /></div></form></template></UModal>
    <article v-if="printTarget" class="print-sheet" dir="rtl"><header><p>عيادة الرعاية العامة</p><h1>وصفة طبية</h1><p>التاريخ: {{ formatDate(printTarget.prescribed_on) }}</p></header><section><h2>{{ selectedPatient?.full_name }}</h2><p>الهاتف: {{ selectedPatient?.phone }}</p><hr><h3>{{ printTarget.medicine_name }}</h3><p><strong>الجرعة:</strong> {{ printTarget.dosage }}</p><p><strong>التكرار:</strong> {{ printTarget.frequency }}</p><p><strong>المدة:</strong> {{ printTarget.duration_days ? `${printTarget.duration_days} أيام` : 'حسب التوجيه الطبي' }}</p><p v-if="printTarget.notes"><strong>تعليمات:</strong> {{ printTarget.notes }}</p></section><footer>الطبيب المعالج: {{ printTarget.prescribed_by_name }}</footer></article>
  </section>
</template>

<style>
.print-sheet { display: none; }
@media print {
  body * { visibility: hidden; }
  .print-sheet, .print-sheet * { visibility: visible; }
  .print-sheet { display: block; position: absolute; inset: 0; padding: 28mm 22mm; color: #111; font-family: "IBM Plex Sans Arabic", sans-serif; }
  .print-sheet header { border-bottom: 2px solid #1f6f78; padding-bottom: 12mm; }
  .print-sheet h1 { font-size: 28pt; margin: 3mm 0; }
  .print-sheet h2 { font-size: 20pt; }
  .print-sheet h3 { font-size: 22pt; margin-bottom: 8mm; }
  .print-sheet p { font-size: 14pt; line-height: 1.8; }
  .print-sheet footer { border-top: 1px solid #777; margin-top: 22mm; padding-top: 6mm; }
}
</style>