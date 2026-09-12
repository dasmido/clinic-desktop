<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth'
import type { Doctor, MedicalRecord, Patient } from '@/modules/clinic-data'

type VisitWithPatient = MedicalRecord & {
  patient_name?: string
  patient_phone?: string
}

const router = useRouter()
const { currentUser } = useAuth()

const visits = ref<VisitWithPatient[]>([])
const patients = ref<Patient[]>([])
const doctors = ref<Doctor[]>([])

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const searchQuery = ref('')
const isLoading = ref(false)
const isModalOpen = ref(false)
const errorMessage = ref('')
const editingVisit = ref<VisitWithPatient | null>(null)

const form = ref({
  patientId: '',
  doctorId: '',
  visitDate: '',
  chiefComplaint: '',
  diagnosis: '',
  treatmentPlan: '',
  clinicalNotes: '',
  bloodPressure: '',
  temperature: '',
  weight: '',
})

const isCalendarOpen = ref(false)
const isCalendarLoading = ref(false)
const calendarMonth = ref(new Date(`${selectedDate.value}T12:00:00`))
const calendarVisits = ref<VisitWithPatient[]>([])
const weekdayLabels = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

const filteredVisits = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return visits.value

  return visits.value.filter((visit) => {
    const pName = (visit.patient_name || '').toLowerCase()
    const pPhone = (visit.patient_phone || '').toLowerCase()
    const docName = (visit.doctor_name || '').toLowerCase()
    const diag = (visit.diagnosis || '').toLowerCase()
    const complaint = (visit.chief_complaint || '').toLowerCase()
    return pName.includes(q) || pPhone.includes(q) || docName.includes(q) || diag.includes(q) || complaint.includes(q)
  })
})

const dayLabel = computed(() =>
  new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${selectedDate.value}T12:00:00`))
)

const calendarMonthLabel = computed(() =>
  new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(calendarMonth.value)
)

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const visitsByDate = computed(() => {
  const map = new Map<string, VisitWithPatient[]>()
  for (const visit of calendarVisits.value) {
    const key = toLocalDateKey(new Date(visit.visit_date))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(visit)
  }
  return map
})

const calendarWeeks = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(gridStart.getDate() - firstDay.getDay())

  const weeks: { date: Date; key: string; inMonth: boolean; count: number }[][] = []
  const cursor = new Date(gridStart)
  for (let week = 0; week < 6; week++) {
    const days = []
    for (let day = 0; day < 7; day++) {
      const key = toLocalDateKey(cursor)
      days.push({
        date: new Date(cursor),
        key,
        inMonth: cursor.getMonth() === month,
        count: visitsByDate.value.get(key)?.length ?? 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(days)
  }
  return weeks
})

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function visitTime(visit: VisitWithPatient) {
  if (!visit.visit_date) return ''
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(visit.visit_date))
}

function moveDay(amount: number) {
  const date = new Date(`${selectedDate.value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  selectedDate.value = date.toISOString().slice(0, 10)
}

function resetForm() {
  const now = new Date(`${selectedDate.value}T${new Date().toTimeString().slice(0, 5)}:00`)
  const defaultDoc = doctors.value.length > 0 ? String(doctors.value[0].id) : ''
  const defaultPat = patients.value.length > 0 ? String(patients.value[0].id) : ''

  form.value = {
    patientId: defaultPat,
    doctorId: defaultDoc,
    visitDate: localDateTime(now),
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    clinicalNotes: '',
    bloodPressure: '',
    temperature: '',
    weight: '',
  }
}

function openCreateModal() {
  editingVisit.value = null
  resetForm()
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEditModal(visit: VisitWithPatient) {
  editingVisit.value = visit
  form.value = {
    patientId: String(visit.patient_id),
    doctorId: visit.doctor_id ? String(visit.doctor_id) : '',
    visitDate: localDateTime(new Date(visit.visit_date)),
    chiefComplaint: visit.chief_complaint || '',
    diagnosis: visit.diagnosis || '',
    treatmentPlan: visit.treatment_plan || '',
    clinicalNotes: visit.clinical_notes || '',
    bloodPressure: visit.blood_pressure || '',
    temperature: visit.temperature_celsius !== null ? String(visit.temperature_celsius) : '',
    weight: visit.weight_kg !== null ? String(visit.weight_kg) : '',
  }
  errorMessage.value = ''
  isModalOpen.value = true
}

function goToPatientRecords(patientId: number) {
  router.push(`/patients/${patientId}/records`)
}

async function loadSchedule() {
  isLoading.value = true
  try {
    const from = new Date(`${selectedDate.value}T00:00:00`).toISOString()
    const toDateObj = new Date(`${selectedDate.value}T00:00:00`)
    toDateObj.setDate(toDateObj.getDate() + 1)
    const list = await window.electronAPI.medicalRecords.listForRange(from, toDateObj.toISOString())
    visits.value = list || []
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل سجل الزيارات الطبية.'
  } finally {
    isLoading.value = false
  }
}

async function loadPatients() {
  try {
    const list = await window.electronAPI.patients.list()
    patients.value = list || []
  } catch (err) {
    console.error('Failed to load patients:', err)
  }
}

async function loadDoctors() {
  try {
    const list = await window.electronAPI.doctors.list()
    doctors.value = list || []
  } catch (err) {
    console.error('Failed to load doctors:', err)
  }
}

async function loadCalendarMonth() {
  isCalendarLoading.value = true
  try {
    const from = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth(), 1)
    const to = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1)
    const list = await window.electronAPI.medicalRecords.listForRange(
      from.toISOString(),
      to.toISOString()
    )
    calendarVisits.value = list || []
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل بيانات التقويم.'
  } finally {
    isCalendarLoading.value = false
  }
}

function openCalendar() {
  calendarMonth.value = new Date(`${selectedDate.value}T12:00:00`)
  isCalendarOpen.value = true
  loadCalendarMonth()
}

function moveCalendarMonth(amount: number) {
  const date = new Date(calendarMonth.value)
  date.setDate(1)
  date.setMonth(date.getMonth() + amount)
  calendarMonth.value = date
  loadCalendarMonth()
}

function selectCalendarDay(key: string) {
  selectedDate.value = key
  isCalendarOpen.value = false
}

async function saveVisit() {
  if (!form.value.patientId || !form.value.visitDate) {
    errorMessage.value = 'يرجى اختيار المراجع وتحديد تاريخ وقت الزيارة.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    const recordInput = {
      doctor_id: form.value.doctorId ? Number(form.value.doctorId) : null,
      visit_date: new Date(form.value.visitDate).toISOString(),
      chief_complaint: (form.value.chiefComplaint || '').trim(),
      diagnosis: (form.value.diagnosis || '').trim(),
      treatment_plan: (form.value.treatmentPlan || '').trim(),
      clinical_notes: (form.value.clinicalNotes || '').trim(),
      blood_pressure: (form.value.bloodPressure || '').trim(),
      temperature_celsius: form.value.temperature ? Number(form.value.temperature) : null,
      weight_kg: form.value.weight ? Number(form.value.weight) : null,
    }

    if (editingVisit.value) {
      await window.electronAPI.medicalRecords.update(editingVisit.value.id, recordInput)
    } else {
      await window.electronAPI.medicalRecords.create({
        patient_id: Number(form.value.patientId),
        recorded_by_user_id: currentUser.value?.id ?? null,
        ...recordInput,
      })
    }
    isModalOpen.value = false
    await loadSchedule()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الزيارة الطبية.'
  } finally {
    isLoading.value = false
  }
}

async function deleteVisit() {
  if (!editingVisit.value || !window.confirm('حذف هذه الزيارة الطبية نهائياً؟')) return
  isLoading.value = true
  try {
    await window.electronAPI.medicalRecords.delete(editingVisit.value.id)
    isModalOpen.value = false
    await loadSchedule()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف الزيارة.'
  } finally {
    isLoading.value = false
  }
}

watch(selectedDate, loadSchedule)

onMounted(async () => {
  await Promise.all([loadSchedule(), loadPatients(), loadDoctors()])
})
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">سجل الزيارات والعيادة اليومي</p>
        <h1 class="mt-1 text-2xl font-bold text-highlighted">الزيارات الطبية</h1>
        <p class="mt-1 text-sm text-muted">استعراض وتوثيق الزيارات الطبية لجميع المراجعين بحسب التاريخ.</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-calendar-days"
          label="عرض التقويم"
          color="neutral"
          variant="outline"
          @click="openCalendar"
        />
        <UButton
          icon="i-lucide-plus"
          label="زيارة جديدة"
          :disabled="!patients.length"
          @click="openCreateModal"
        />
      </div>
    </header>

    <div class="flex flex-col gap-3 border border-default bg-elevated/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          aria-label="اليوم السابق"
          @click="moveDay(-1)"
        />
        <UInput v-model="selectedDate" type="date" class="w-42" />
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          aria-label="اليوم التالي"
          @click="moveDay(1)"
        />
        <UButton
          color="neutral"
          variant="soft"
          label="اليوم"
          @click="selectedDate = new Date().toISOString().slice(0, 10)"
        />
      </div>

      <p class="font-semibold text-highlighted">{{ dayLabel }}</p>

      <div class="w-full sm:w-64">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="بحث بأسماء المراجعين أو التشخيص..."
          class="w-full"
        />
      </div>
    </div>

    <div v-if="!patients.length && !isLoading" class="border border-dashed border-default p-10 text-center">
      <p class="font-semibold text-highlighted">أضف مراجعاً أولاً</p>
      <p class="mt-1 text-sm text-muted">لا يمكن تسجيل زيارات بدون وجود سجلات للمراجعين.</p>
      <UButton to="/patients" class="mt-4" label="الذهاب إلى المراجعين" />
    </div>

    <div v-else class="overflow-hidden border border-default bg-default shadow-sm">
      <div class="flex items-center justify-between border-b border-default bg-elevated/35 px-5 py-3">
        <span class="text-sm font-semibold text-highlighted">{{ filteredVisits.length }} زيارات مسجلة</span>
        <span class="text-xs text-muted">سجل اليوم</span>
      </div>

      <div v-if="isLoading" class="flex min-h-56 items-center justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
      </div>

      <div v-else-if="!filteredVisits.length" class="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
        <UIcon name="i-lucide-file-x-2" class="size-8 text-dimmed" />
        <p class="font-medium text-highlighted">لا توجد زيارات مسجلة في هذا اليوم</p>
        <p class="text-sm text-muted">يمكنك إضافة زيارة جديدة بالضغط على "زيارة جديدة".</p>
      </div>

      <div v-else class="divide-y divide-default">
        <article
          v-for="visit in filteredVisits"
          :key="visit.id"
          class="p-5 transition-colors hover:bg-elevated/20 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-highlighted text-base">{{ visit.patient_name || `مراجع #${visit.patient_id}` }}</span>
              <span class="text-xs text-muted" dir="ltr">{{ visit.patient_phone }}</span>
              <UBadge
                v-if="visit.doctor_name"
                :label="`د. ${visit.doctor_name}`"
                color="neutral"
                variant="subtle"
                size="xs"
              />
              <span class="text-xs font-semibold text-primary" dir="ltr">⏱ {{ visitTime(visit) }}</span>
            </div>

            <p v-if="visit.chief_complaint" class="text-xs text-toned">
              <span class="font-semibold text-muted">الشكوى:</span> {{ visit.chief_complaint }}
            </p>

            <p v-if="visit.diagnosis" class="text-xs text-toned">
              <span class="font-semibold text-muted">التشخيص:</span> {{ visit.diagnosis }}
            </p>

            <p v-if="visit.treatment_plan" class="text-xs text-toned">
              <span class="font-semibold text-muted">العلاج:</span> {{ visit.treatment_plan }}
            </p>

            <div v-if="visit.blood_pressure || visit.temperature_celsius || visit.weight_kg" class="flex flex-wrap gap-2 pt-1">
              <UBadge v-if="visit.blood_pressure" :label="`الضغط: ${visit.blood_pressure}`" color="neutral" variant="outline" size="xs" />
              <UBadge v-if="visit.temperature_celsius" :label="`الحرارة: ${visit.temperature_celsius}°C`" color="neutral" variant="outline" size="xs" />
              <UBadge v-if="visit.weight_kg" :label="`الوزن: ${visit.weight_kg} كغم`" color="neutral" variant="outline" size="xs" />
            </div>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-center">
            <UButton
              icon="i-lucide-folder-open"
              color="primary"
              variant="ghost"
              size="xs"
              label="السجل الطبي الكامل"
              @click="goToPatientRecords(visit.patient_id)"
            />
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="outline"
              size="xs"
              label="تعديل"
              @click="openEditModal(visit)"
            />
          </div>
        </article>
      </div>
    </div>

    <p v-if="errorMessage && !isModalOpen" class="text-sm text-error">{{ errorMessage }}</p>

    <!-- Modal to Add/Edit Visit (Medical Record) -->
    <UModal v-model:open="isModalOpen" :title="editingVisit ? 'تعديل الزيارة الطبية' : 'توثيق زيارة جديدة'">
      <template #body>
        <form class="space-y-4" @submit.prevent="saveVisit">
          <UFormField label="المراجع" required>
            <USelect
              v-model="form.patientId"
              :items="patients.map((patient) => ({ label: `${patient.full_name} - ${patient.phone}`, value: String(patient.id) }))"
              class="w-full"
              :disabled="!!editingVisit"
            />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="الطبيب المعالج">
              <USelect
                v-model="form.doctorId"
                :items="doctors.map((doctor) => ({ label: doctor.display_name, value: String(doctor.id) }))"
                placeholder="اختر الطبيب"
                class="w-full"
              />
            </UFormField>

            <UFormField label="تاريخ ووقت الزيارة" required>
              <UInput v-model="form.visitDate" type="datetime-local" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="الشكوى الرئيسية">
            <UTextarea v-model="form.chiefComplaint" placeholder="ما الذي يشكو منه المراجع؟" class="w-full" :rows="2" />
          </UFormField>

          <UFormField label="التشخيص">
            <UTextarea v-model="form.diagnosis" placeholder="التشخيص الطبي للزيارة" class="w-full" :rows="2" />
          </UFormField>

          <UFormField label="خطة العلاج">
            <UTextarea v-model="form.treatmentPlan" placeholder="الأدوية والإجراءات العلاجية الموصى بها" class="w-full" :rows="2" />
          </UFormField>

          <UFormField label="ملاحظات سريرية إضافية">
            <UTextarea v-model="form.clinicalNotes" class="w-full" :rows="2" />
          </UFormField>

          <div class="grid gap-3 sm:grid-cols-3">
            <UFormField label="ضغط الدم">
              <UInput v-model="form.bloodPressure" placeholder="120/80" />
            </UFormField>

            <UFormField label="الحرارة (°C)">
              <UInput v-model="form.temperature" type="number" step="0.1" placeholder="37" />
            </UFormField>

            <UFormField label="الوزن (كغم)">
              <UInput v-model="form.weight" type="number" step="0.1" placeholder="70" />
            </UFormField>
          </div>

          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

          <div class="flex justify-between gap-2 pt-2 border-t border-default">
            <UButton
              v-if="editingVisit"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="حذف الزيارة"
              :loading="isLoading"
              @click="deleteVisit"
            />
            <span class="flex gap-2">
              <UButton color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" />
              <UButton type="submit" :loading="isLoading" :label="editingVisit ? 'حفظ التعديلات' : 'إضافة الزيارة'" />
            </span>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Month Calendar Modal -->
    <UModal v-model:open="isCalendarOpen" title="تقويم الزيارات الطبية" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              aria-label="الشهر السابق"
              @click="moveCalendarMonth(-1)"
            />
            <p class="text-lg font-semibold text-highlighted">{{ calendarMonthLabel }}</p>
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              aria-label="الشهر التالي"
              @click="moveCalendarMonth(1)"
            />
          </div>

          <div v-if="isCalendarLoading" class="flex min-h-72 items-center justify-center">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
          </div>

          <div v-else class="overflow-hidden border border-default">
            <div class="grid grid-cols-7 border-b border-default bg-elevated/35">
              <span v-for="label in weekdayLabels" :key="label" class="p-2 text-center text-xs font-semibold text-muted">{{ label }}</span>
            </div>

            <div class="grid grid-cols-7">
              <button
                v-for="day in calendarWeeks.flat()"
                :key="day.key"
                class="flex min-h-20 flex-col items-center gap-1 border-b border-l border-default p-2 text-sm transition-colors last:border-l-0 hover:bg-elevated/35"
                :class="[!day.inMonth && 'text-dimmed', day.key === selectedDate && 'bg-primary/10']"
                @click="selectCalendarDay(day.key)"
              >
                <span class="font-medium">{{ day.date.getDate() }}</span>
                <span v-if="day.count" class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{{ day.count }} زيارة</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>