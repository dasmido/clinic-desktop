<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth'
import type { Doctor, Patient } from '@/modules/clinic-data'

const router = useRouter()
const { currentUser } = useAuth()
const patients = ref<Patient[]>([])
const doctors = ref<Doctor[]>([])
const isSaving = ref(false)
const errorMessage = ref('')
const form = ref({ patientId: '', doctorId: '', visitDate: '', chiefComplaint: '', diagnosis: '', treatmentPlan: '', clinicalNotes: '', bloodPressure: '', temperature: '', weight: '' })

function localDateTime() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function goBack() { void router.push('/appointments') }

async function saveVisit() {
  if (!form.value.patientId || !form.value.visitDate) {
    errorMessage.value = 'يرجى اختيار المراجع وتحديد تاريخ وقت الزيارة.'
    return
  }
  isSaving.value = true
  errorMessage.value = ''
  try {
    await window.electronAPI.medicalRecords.create({
      patient_id: Number(form.value.patientId),
      recorded_by_user_id: currentUser.value?.id ?? null,
      doctor_id: form.value.doctorId ? Number(form.value.doctorId) : null,
      visit_date: new Date(form.value.visitDate).toISOString(),
      chief_complaint: form.value.chiefComplaint.trim(),
      diagnosis: form.value.diagnosis.trim(),
      treatment_plan: form.value.treatmentPlan.trim(),
      clinical_notes: form.value.clinicalNotes.trim(),
      blood_pressure: form.value.bloodPressure.trim(),
      temperature_celsius: form.value.temperature ? Number(form.value.temperature) : null,
      weight_kg: form.value.weight ? Number(form.value.weight) : null,
    })
    await router.push('/appointments')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الزيارة الطبية.'
  } finally { isSaving.value = false }
}

onMounted(async () => {
  try {
    const [patientRows, doctorRows] = await Promise.all([window.electronAPI.patients.list(), window.electronAPI.doctors.list()])
    patients.value = patientRows || []
    doctors.value = doctorRows || []
    form.value.patientId = patients.value[0] ? String(patients.value[0].id) : ''
    form.value.doctorId = doctors.value[0] ? String(doctors.value[0].id) : ''
    form.value.visitDate = localDateTime()
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل بيانات الزيارة.' }
})
</script>

<template>
  <section class="mx-auto w-full max-w-5xl space-y-6">
    <header class="border-b border-default pb-5"><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" label="الزيارات الطبية" class="-me-2 mb-3" @click="goBack" /><h1 class="text-2xl font-bold text-highlighted">توثيق زيارة جديدة</h1><p class="mt-2 text-sm text-muted">أدخل تفاصيل الزيارة الطبية والملاحظات السريرية.</p></header>
    <form class="space-y-5 border border-default bg-default p-5 shadow-sm sm:p-7" @submit.prevent="saveVisit">
      <div class="grid gap-4 sm:grid-cols-2"><UFormField label="المراجع" required><USelect v-model="form.patientId" :items="patients.map((patient) => ({ label: `${patient.full_name} - ${patient.phone}`, value: String(patient.id) }))" class="w-full" /></UFormField><UFormField label="الطبيب المعالج"><USelect v-model="form.doctorId" :items="doctors.map((doctor) => ({ label: `د. ${doctor.display_name}`, value: String(doctor.id) }))" placeholder="اختر الطبيب" class="w-full" /></UFormField><UFormField label="تاريخ ووقت الزيارة" required><UInput v-model="form.visitDate" type="datetime-local" class="w-full" /></UFormField></div>
      <UFormField label="الشكوى الرئيسية"><UTextarea v-model="form.chiefComplaint" class="w-full" :rows="3" /></UFormField><UFormField label="التشخيص"><UTextarea v-model="form.diagnosis" class="w-full" :rows="3" /></UFormField><UFormField label="خطة العلاج"><UTextarea v-model="form.treatmentPlan" class="w-full" :rows="3" /></UFormField><UFormField label="ملاحظات سريرية إضافية"><UTextarea v-model="form.clinicalNotes" class="w-full" :rows="3" /></UFormField>
      <div class="grid gap-4 sm:grid-cols-3"><UFormField label="ضغط الدم"><UInput v-model="form.bloodPressure" placeholder="120/80" class="w-full" /></UFormField><UFormField label="الحرارة (°م)"><UInput v-model="form.temperature" type="number" step="0.1" class="w-full" /></UFormField><UFormField label="الوزن (كغ)"><UInput v-model="form.weight" type="number" step="0.1" class="w-full" /></UFormField></div>
      <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex flex-wrap justify-end gap-2 border-t border-default pt-5"><UButton icon="i-lucide-x" color="neutral" variant="ghost" label="إلغاء" @click="goBack" /><UButton type="submit" icon="i-lucide-save" :loading="isSaving" label="إضافة الزيارة" /></div>
    </form>
  </section>
</template>
