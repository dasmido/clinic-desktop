<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth'
import type { Doctor, MedicalRecord, MedicalRecordAttachment, Patient } from '@/modules/clinic-data'

const route = useRoute()
const router = useRouter()
const { currentUser } = useAuth()
const patientId = Number(route.params.patientId)
const patient = ref<Patient | null>(null)
const doctors = ref<Doctor[]>([])
const allRecords = ref<MedicalRecord[]>([])
const attachments = ref<MedicalRecordAttachment[]>([])
const isLoading = ref(false)
const isRecordModalOpen = ref(false)
const editingRecordId = ref<number | null>(null)
const currentPage = ref(1)
const pageSize = 3
const errorMessage = ref('')
const form = ref({ visitDate: new Date().toISOString().slice(0, 16), doctorId: '', chiefComplaint: '', diagnosis: '', treatmentPlan: '', clinicalNotes: '', bloodPressure: '', temperature: '', weight: '' })

const records = computed(() => allRecords.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const attachmentsByRecord = computed(() => new Map(allRecords.value.map((record) => [record.id, attachments.value.filter((attachment) => attachment.medical_record_id === record.id)])))
const totalPages = computed(() => Math.max(1, Math.ceil(allRecords.value.length / pageSize)))

function dateTime(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function fileSize(value: string) {
  const bytes = Number(value)
  return bytes < 1_000_000 ? `${Math.ceil(bytes / 1024)} ك.ب` : `${(bytes / 1_000_000).toFixed(1)} م.ب`
}

function openRecordModal() {
  editingRecordId.value = null
  form.value = { visitDate: new Date().toISOString().slice(0, 16), doctorId: '', chiefComplaint: '', diagnosis: '', treatmentPlan: '', clinicalNotes: '', bloodPressure: '', temperature: '', weight: '' }
  errorMessage.value = ''
  isRecordModalOpen.value = true
}

function editRecord(record: MedicalRecord) {
  editingRecordId.value = record.id
  form.value = {
    visitDate: new Date(record.visit_date).toISOString().slice(0, 16),
    doctorId: record.doctor_id ? String(record.doctor_id) : '',
    chiefComplaint: record.chief_complaint,
    diagnosis: record.diagnosis,
    treatmentPlan: record.treatment_plan,
    clinicalNotes: record.clinical_notes,
    bloodPressure: record.blood_pressure,
    temperature: record.temperature_celsius ?? '',
    weight: record.weight_kg ?? '',
  }
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
    const [patients, doctorRows, medicalData] = await Promise.all([
      window.electronAPI.patients.list(),
      window.electronAPI.doctors.list(),
      window.electronAPI.medicalRecords.listByPatient(patientId),
    ])
    patient.value = patients.find((candidate) => candidate.id === patientId) ?? null
    doctors.value = doctorRows
    allRecords.value = medicalData.records
    attachments.value = medicalData.attachments
    currentPage.value = Math.min(currentPage.value, totalPages.value)
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
    const recordInput = {
      doctor_id: data.doctorId ? Number(data.doctorId) : null,
      visit_date: new Date(data.visitDate).toISOString(),
      chief_complaint: data.chiefComplaint.trim(),
      diagnosis: data.diagnosis.trim(),
      treatment_plan: data.treatmentPlan.trim(),
      clinical_notes: data.clinicalNotes.trim(),
      blood_pressure: data.bloodPressure.trim(),
      temperature_celsius: data.temperature ? Number(data.temperature) : null,
      weight_kg: data.weight ? Number(data.weight) : null,
    }
    if (editingRecordId.value) {
      await window.electronAPI.medicalRecords.update(editingRecordId.value, recordInput)
    } else {
      await window.electronAPI.medicalRecords.create({
        patient_id: patientId,
        recorded_by_user_id: currentUser.value?.id ?? null,
        ...recordInput,
      })
    }
    editingRecordId.value = null
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
      await window.electronAPI.medicalRecords.addAttachment({
        medical_record_id: record.id,
        original_name: file.originalName,
        stored_name: file.storedName,
        file_size_bytes: file.fileSizeBytes,
      })
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
    await window.electronAPI.medicalRecords.delete(record.id)
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
    await window.electronAPI.medicalRecords.deleteAttachment(attachment.id)
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
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><article v-for="record in records" :key="record.id" class="flex min-w-0 flex-col border border-default bg-default p-4 shadow-sm"><div class="flex items-start justify-between gap-2 border-b border-default pb-3"><div class="min-w-0"><p class="truncate font-semibold text-highlighted">زيارة {{ dateTime(record.visit_date) }}</p><p class="mt-1 truncate text-xs text-muted">سجلها {{ record.recorded_by_name ?? 'مستخدم العيادة' }}</p></div><div class="flex shrink-0 items-center gap-1"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="تعديل الزيارة" @click="editRecord(record)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" aria-label="حذف الزيارة" @click="deleteRecord(record)" /></div></div><div class="flex-1 space-y-3 py-3"><div><p class="text-xs font-medium text-muted">الشكوى الرئيسية</p><p class="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-highlighted">{{ record.chief_complaint || '—' }}</p></div><div><p class="text-xs font-medium text-muted">التشخيص</p><p class="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-highlighted">{{ record.diagnosis || '—' }}</p></div><div><p class="text-xs font-medium text-muted">الخطة العلاجية</p><p class="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-highlighted">{{ record.treatment_plan || '—' }}</p></div><div><p class="text-xs font-medium text-muted">المؤشرات الحيوية</p><p class="mt-1 text-sm text-highlighted">{{ [record.blood_pressure && `الضغط ${record.blood_pressure}`, record.temperature_celsius && `الحرارة ${record.temperature_celsius}°`, record.weight_kg && `الوزن ${record.weight_kg} كغ`].filter(Boolean).join(' · ') || '—' }}</p></div><div v-if="record.clinical_notes"><p class="text-xs font-medium text-muted">ملاحظات سريرية</p><p class="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-highlighted">{{ record.clinical_notes }}</p></div></div><div class="mt-auto border-t border-default pt-3"><div class="flex items-center justify-between gap-2"><p class="text-xs font-medium text-muted">التحاليل والفحوصات</p><UButton icon="i-lucide-paperclip" color="neutral" variant="soft" size="sm" aria-label="إضافة فحص" :loading="isLoading" @click="addAttachment(record)" /></div><div v-if="attachmentsByRecord.get(record.id)?.length" class="mt-2 space-y-1"><div v-for="attachment in attachmentsByRecord.get(record.id)" :key="attachment.id" class="flex min-w-0 items-center gap-1"><UButton class="min-w-0 flex-1 justify-start" icon="i-lucide-file-text" color="neutral" variant="ghost" size="sm" :label="`${attachment.original_name} (${fileSize(attachment.file_size_bytes)})`" @click="openAttachment(attachment)" /><UButton icon="i-lucide-file-x-2" color="error" variant="ghost" size="sm" :aria-label="`حذف ${attachment.original_name}`" @click="deleteAttachment(attachment)" /></div></div><p v-else class="mt-2 text-xs text-dimmed">لا توجد مرفقات</p></div></article></div>
    <UModal v-model:open="isRecordModalOpen" title="تسجيل زيارة طبية"><template #body><form class="space-y-4" @submit.prevent="saveRecord"><UFormField label="تاريخ ووقت الزيارة" required><UInput v-model="form.visitDate" type="datetime-local" class="w-full" autofocus /></UFormField><UFormField label="الطبيب"><div class="flex items-center gap-2"><USelect v-model="form.doctorId" :items="doctors.map((doctor) => ({ label: doctor.display_name, value: String(doctor.id) }))" placeholder="اختر الطبيب" class="w-full min-w-0 flex-1" /><UButton v-if="!doctors.length && currentUser?.role === 'admin'" icon="i-lucide-plus" color="neutral" variant="soft" aria-label="إضافة طبيب" @click="router.push('/settings/users')" /></div></UFormField><div class="grid gap-4 sm:grid-cols-2"><UFormField label="الشكوى الرئيسية"><UTextarea v-model="form.chiefComplaint" class="w-full" :rows="3" /></UFormField><UFormField label="التشخيص"><UTextarea v-model="form.diagnosis" class="w-full" :rows="3" /></UFormField></div><UFormField label="الخطة العلاجية"><UTextarea v-model="form.treatmentPlan" class="w-full" :rows="3" /></UFormField><div class="grid gap-4 sm:grid-cols-3"><UFormField label="ضغط الدم"><UInput v-model="form.bloodPressure" placeholder="120/80" class="w-full" dir="ltr" /></UFormField><UFormField label="الحرارة (°م)"><UInput v-model="form.temperature" type="number" step="0.1" class="w-full" /></UFormField><UFormField label="الوزن (كغ)"><UInput v-model="form.weight" type="number" step="0.1" class="w-full" /></UFormField></div><UFormField label="ملاحظات سريرية"><UTextarea v-model="form.clinicalNotes" class="w-full" :rows="3" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isRecordModalOpen = false" /><UButton type="submit" :loading="isLoading" label="حفظ الزيارة" /></div></form></template></UModal>
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-3"><UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" aria-label="الصفحة السابقة" :disabled="currentPage === 1" @click="currentPage -= 1" /><span class="text-sm text-muted">صفحة {{ currentPage }} من {{ totalPages }}</span><UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="الصفحة التالية" :disabled="currentPage === totalPages" @click="currentPage += 1" /></div>
  </section>
</template>