<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth'
import type { Doctor, Patient } from '@/modules/clinic-data'

const route = useRoute(); const router = useRouter(); const { currentUser } = useAuth()
const patientId = Number(route.params.patientId)
const patient = ref<Patient | null>(null); const doctors = ref<Doctor[]>([]); const isSaving = ref(false); const errorMessage = ref('')
const form = ref({ visitDate: '', doctorId: '', chiefComplaint: '', diagnosis: '', treatmentPlan: '', clinicalNotes: '', bloodPressure: '', temperature: '', weight: '' })
function goBack() { void router.push(`/patients/${patientId}/records`) }
function localDateTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }
async function saveRecord() {
  if (!form.value.visitDate) { errorMessage.value = 'أدخل تاريخ الزيارة.'; return }
  isSaving.value = true; errorMessage.value = ''
  try {
    await window.electronAPI.medicalRecords.create({ patient_id: patientId, recorded_by_user_id: currentUser.value?.id ?? null, doctor_id: form.value.doctorId ? Number(form.value.doctorId) : null, visit_date: new Date(form.value.visitDate).toISOString(), chief_complaint: form.value.chiefComplaint.trim(), diagnosis: form.value.diagnosis.trim(), treatment_plan: form.value.treatmentPlan.trim(), clinical_notes: form.value.clinicalNotes.trim(), blood_pressure: form.value.bloodPressure.trim(), temperature_celsius: form.value.temperature ? Number(form.value.temperature) : null, weight_kg: form.value.weight ? Number(form.value.weight) : null })
    await router.push(`/patients/${patientId}/records`)
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ السجل الطبي.' } finally { isSaving.value = false }
}
onMounted(async () => { try { const [patients, doctorRows] = await Promise.all([window.electronAPI.patients.list(), window.electronAPI.doctors.list()]); patient.value = patients.find((item) => item.id === patientId) ?? null; doctors.value = doctorRows; form.value.visitDate = localDateTime() } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل بيانات المراجع.' } })
</script>
<template><section class="mx-auto w-full max-w-5xl space-y-6"><header class="border-b border-default pb-5"><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" :label="patient?.full_name ?? 'السجل الطبي'" class="-me-2 mb-3" @click="goBack" /><h1 class="text-2xl font-bold text-highlighted">تسجيل زيارة طبية</h1><p v-if="patient" class="mt-2 text-sm text-muted">{{ patient.full_name }} · <span dir="ltr">{{ patient.phone }}</span></p></header><form class="space-y-5 border border-default bg-default p-5 shadow-sm sm:p-7" @submit.prevent="saveRecord"><UFormField label="تاريخ ووقت الزيارة" required><UInput v-model="form.visitDate" type="datetime-local" class="w-full" autofocus /></UFormField><UFormField label="الطبيب"><USelect v-model="form.doctorId" :items="doctors.map((doctor) => ({ label: doctor.display_name, value: String(doctor.id) }))" placeholder="اختر الطبيب" class="w-full" /></UFormField><div class="grid gap-4 sm:grid-cols-2"><UFormField label="الشكوى الرئيسية"><UTextarea v-model="form.chiefComplaint" class="w-full" :rows="3" /></UFormField><UFormField label="التشخيص"><UTextarea v-model="form.diagnosis" class="w-full" :rows="3" /></UFormField></div><UFormField label="الخطة العلاجية"><UTextarea v-model="form.treatmentPlan" class="w-full" :rows="3" /></UFormField><div class="grid gap-4 sm:grid-cols-3"><UFormField label="ضغط الدم"><UInput v-model="form.bloodPressure" class="w-full" dir="ltr" /></UFormField><UFormField label="الحرارة (°م)"><UInput v-model="form.temperature" type="number" step="0.1" class="w-full" /></UFormField><UFormField label="الوزن (كغ)"><UInput v-model="form.weight" type="number" step="0.1" class="w-full" /></UFormField></div><UFormField label="ملاحظات سريرية"><UTextarea v-model="form.clinicalNotes" class="w-full" :rows="3" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 border-t border-default pt-5"><UButton icon="i-lucide-x" color="neutral" variant="ghost" label="إلغاء" @click="goBack" /><UButton type="submit" :loading="isSaving" label="حفظ الزيارة" /></div></form></section></template>
