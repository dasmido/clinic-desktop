<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth'
import { databaseQuery, type MedicalRecord, type MedicalRecordAttachment, type Patient } from '@/modules/clinic-data'

const route = useRoute()
const router = useRouter()
const { currentUser } = useAuth()
const patientId = Number(route.params.patientId)
const patient = ref<Patient | null>(null)
const records = ref<MedicalRecord[]>([])
const attachments = ref<MedicalRecordAttachment[]>([])
const isLoading = ref(false)
const isRecordModalOpen = ref(false)
const errorMessage = ref('')
const form = ref({ visitDate: new Date().toISOString().slice(0, 16), chiefComplaint: '', diagnosis: '', treatmentPlan: '', clinicalNotes: '', bloodPressure: '', temperature: '', weight: '' })

const attachmentsByRecord = computed(() => new Map(records.value.map((record) => [record.id, attachments.value.filter((attachment) => attachment.medical_record_id === record.id)])))

function dateTime(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function fileSize(value: string) {
  const bytes = Number(value)
  return bytes < 1_000_000 ? `${Math.ceil(bytes / 1024)} ك.ب` : `${(bytes / 1_000_000).toFixed(1)} م.ب`
}

function openRecordModal() {
  form.value = { visitDate: new Date().toISOString().slice(0, 16), chiefComplaint: '', diagnosis: '', treatmentPlan: '', clinicalNotes: '', bloodPressure: '', temperature: '', weight: '' }
  errorMessage.value = ''
  isRecordModalOpen.value = true
}

async function loadRecords() {
  if (!Number.isInteger(patientId) || patientId < 1) {
    errorMessage.value = 'معرف المراجع غير صالح.'
    return
  }
  isLoading.value = true
  try {
    const [patients, medicalRecords] = await Promise.all([
      databaseQuery<Patient>('SELECT id, full_name, phone, date_of_birth::text, notes, created_at::text FROM patients WHERE id = $1', [patientId]),
      databaseQuery<MedicalRecord>(`SELECT records.id, records.patient_id, records.recorded_by_user_id, users.username AS recorded_by_name, records.visit_date::text, records.chief_complaint, records.diagnosis, records.treatment_plan, records.clinical_notes, records.blood_pressure, records.temperature_celsius::text, records.weight_kg::text, records.created_at::text FROM patient_medical_records AS records LEFT JOIN users ON users.id = records.recorded_by_user_id WHERE records.patient_id = $1 ORDER BY records.visit_date DESC`, [patientId]),
    ])
    patient.value = patients[0] ?? null
    records.value = medicalRecords
    attachments.value = medicalRecords.length ? await databaseQuery<MedicalRecordAttachment>(`SELECT id, medical_record_id, original_name, stored_name, mime_type, file_size_bytes::text, created_at::text FROM patient_record_attachments WHERE medical_record_id = ANY($1::int[]) ORDER BY id DESC`, [medicalRecords.map((record) => record.id)]) : []
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل السجل الطبي.'
  } finally {
    isLoading.value = false
  }
}

async function saveRecord() {
  const data = form.value
  if (!data.visitDate) {
    errorMessage.value = 'أدخل تاريخ الزيارة.'
    return
  }
  isLoading.value = true
  try {
    await databaseQuery('INSERT INTO patient_medical_records (patient_id, recorded_by_user_id, visit_date, chief_complaint, diagnosis, treatment_plan, clinical_notes, blood_pressure, temperature_celsius, weight_kg) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [patientId, currentUser.value?.id ?? null, new Date(data.visitDate).toISOString(), data.chiefComplaint.trim(), data.diagnosis.trim(), data.treatmentPlan.trim(), data.clinicalNotes.trim(), data.bloodPressure.trim(), data.temperature ? Number(data.temperature) : null, data.weight ? Number(data.weight) : null])
    isRecordModalOpen.value = false
    await loadRecords()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ السجل الطبي.'
  } finally {
    isLoading.value = false
  }
}

async function addAttachment(record: MedicalRecord) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const files = await window.electronAPI.patientFiles.add(record.id)
    for (const file of files) {
      await databaseQuery('INSERT INTO patient_record_attachments (medical_record_id, original_name, stored_name, file_size_bytes) VALUES ($1, $2, $3, $4)', [record.id, file.originalName, file.storedName, file.fileSizeBytes])
    }
    await loadRecords()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر إضافة المرفق.'
  } finally {
    isLoading.value = false
  }
}

async function openAttachment(attachment: MedicalRecordAttachment) {
  try {
    await window.electronAPI.patientFiles.open(attachment.medical_record_id, attachment.stored_name)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر فتح المرفق.'
  }
}

async function deleteRecord(record: MedicalRecord) {
  if (!window.confirm('حذف هذه الزيارة وجميع نتائجها وفحوصاتها؟')) return
  isLoading.value = true
  try {
    await window.electronAPI.patientFiles.deleteRecord(record.id)
    await databaseQuery('DELETE FROM patient_medical_records WHERE id = $1', [record.id])
    await loadRecords()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف الزيارة.'
  } finally {
    isLoading.value = false
  }
}

async function deleteAttachment(attachment: MedicalRecordAttachment) {
  if (!window.confirm(`حذف المرفق ${attachment.original_name}؟`)) return
  isLoading.value = true
  try {
    await window.electronAPI.patientFiles.delete(attachment.medical_record_id, attachment.stored_name)
    await databaseQuery('DELETE FROM patient_record_attachments WHERE id = $1', [attachment.id])
    await loadRecords()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف المرفق.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRecords)
</script>

<template>
  <section class="mx-auto w-full max-w-5xl space-y-6">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between"><div><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" label="المراجعين" class="-me-2 mb-3" @click="router.push('/patients')" /><p class="text-sm font-medium text-primary">السجل الطبي</p><h1 class="mt-1 text-2xl font-bold text-highlighted">{{ patient?.full_name ?? 'سجل المراجع' }}</h1><p v-if="patient" class="mt-1 text-sm text-muted" dir="ltr">{{ patient.phone }}</p></div><UButton icon="i-lucide-notebook-pen" label="تسجيل زيارة" :disabled="!patient" @click="openRecordModal" /></header>
    <p v-if="errorMessage && !isRecordModalOpen" class="text-sm text-error">{{ errorMessage }}</p>
    <div v-if="isLoading && !records.length" class="flex min-h-56 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div>
    <div v-else-if="!patient" class="border border-dashed border-default p-10 text-center"><p class="font-semibold text-highlighted">لم يتم العثور على المراجع</p></div>
    <div v-else-if="!records.length" class="border border-dashed border-default p-10 text-center"><UIcon name="i-lucide-heart-pulse" class="mx-auto size-8 text-dimmed" /><p class="mt-3 font-semibold text-highlighted">لا توجد زيارات مسجلة</p><p class="mt-1 text-sm text-muted">أضف أول زيارة لتوثيق الحالة الصحية والفحوصات.</p></div>
    <div v-else class="space-y-4"><article v-for="record in records" :key="record.id" class="border border-default bg-default p-5 shadow-sm"><div class="flex flex-col gap-3 border-b border-default pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p class="font-semibold text-highlighted">زيارة {{ dateTime(record.visit_date) }}</p><p class="mt-1 text-xs text-muted">سجلها {{ record.recorded_by_name ?? 'مستخدم العيادة' }}</p></div><UButton icon="i-lucide-paperclip" color="neutral" variant="soft" label="إضافة فحص" :loading="isLoading" @click="addAttachment(record)" /></div><div class="grid gap-5 py-4 sm:grid-cols-2"><div><p class="text-xs font-medium text-muted">الشكوى الرئيسية</p><p class="mt-1 whitespace-pre-wrap text-sm text-highlighted">{{ record.chief_complaint || '—' }}</p></div><div><p class="text-xs font-medium text-muted">التشخيص</p><p class="mt-1 whitespace-pre-wrap text-sm text-highlighted">{{ record.diagnosis || '—' }}</p></div><div><p class="text-xs font-medium text-muted">الخطة العلاجية</p><p class="mt-1 whitespace-pre-wrap text-sm text-highlighted">{{ record.treatment_plan || '—' }}</p></div><div><p class="text-xs font-medium text-muted">المؤشرات الحيوية</p><p class="mt-1 text-sm text-highlighted">{{ [record.blood_pressure && `الضغط ${record.blood_pressure}`, record.temperature_celsius && `الحرارة ${record.temperature_celsius}°`, record.weight_kg && `الوزن ${record.weight_kg} كغ`].filter(Boolean).join(' · ') || '—' }}</p></div></div><div v-if="record.clinical_notes" class="border-t border-default pt-4"><p class="text-xs font-medium text-muted">ملاحظات سريرية</p><p class="mt-1 whitespace-pre-wrap text-sm text-highlighted">{{ record.clinical_notes }}</p></div><div v-if="attachmentsByRecord.get(record.id)?.length" class="mt-4 border-t border-default pt-4"><p class="mb-2 text-xs font-medium text-muted">التحاليل والفحوصات</p><div class="flex flex-wrap gap-2"><UButton v-for="attachment in attachmentsByRecord.get(record.id)" :key="attachment.id" icon="i-lucide-file-text" color="neutral" variant="soft" :label="`${attachment.original_name} (${fileSize(attachment.file_size_bytes)})`" @click="openAttachment(attachment)" /></div></div></article></div>
    <UModal v-model:open="isRecordModalOpen" title="تسجيل زيارة طبية"><template #body><form class="space-y-4" @submit.prevent="saveRecord"><UFormField label="تاريخ ووقت الزيارة" required><UInput v-model="form.visitDate" type="datetime-local" class="w-full" autofocus /></UFormField><div class="grid gap-4 sm:grid-cols-2"><UFormField label="الشكوى الرئيسية"><UTextarea v-model="form.chiefComplaint" class="w-full" :rows="3" /></UFormField><UFormField label="التشخيص"><UTextarea v-model="form.diagnosis" class="w-full" :rows="3" /></UFormField></div><UFormField label="الخطة العلاجية"><UTextarea v-model="form.treatmentPlan" class="w-full" :rows="3" /></UFormField><div class="grid gap-4 sm:grid-cols-3"><UFormField label="ضغط الدم"><UInput v-model="form.bloodPressure" placeholder="120/80" class="w-full" dir="ltr" /></UFormField><UFormField label="الحرارة (°م)"><UInput v-model="form.temperature" type="number" step="0.1" class="w-full" /></UFormField><UFormField label="الوزن (كغ)"><UInput v-model="form.weight" type="number" step="0.1" class="w-full" /></UFormField></div><UFormField label="ملاحظات سريرية"><UTextarea v-model="form.clinicalNotes" class="w-full" :rows="3" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isRecordModalOpen = false" /><UButton type="submit" :loading="isLoading" label="حفظ الزيارة" /></div></form></template></UModal>
    <section v-if="records.length" class="border border-default bg-elevated/20 p-4">
      <p class="text-sm font-semibold text-highlighted">إدارة السجل</p>
      <div class="mt-3 space-y-2">
        <div v-for="record in records" :key="`delete-${record.id}`" class="flex items-center justify-between gap-3 border-b border-default pb-2 last:border-0 last:pb-0">
          <span class="text-sm text-muted">زيارة {{ dateTime(record.visit_date) }}</span>
          <div class="flex items-center gap-1">
            <UButton v-for="attachment in attachmentsByRecord.get(record.id)" :key="attachment.id" icon="i-lucide-file-x-2" color="error" variant="ghost" :aria-label="`حذف ${attachment.original_name}`" @click="deleteAttachment(attachment)" />
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف الزيارة" @click="deleteRecord(record)" />
          </div>
        </div>
      </div>
    </section>
  </section>
</template>