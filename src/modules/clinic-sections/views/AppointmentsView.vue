<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Appointment, AppointmentStatus, Doctor, Patient } from '@/modules/clinic-data'

const appointments = ref<Appointment[]>([])
const patients = ref<Patient[]>([])
const doctors = ref<Doctor[]>([])
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const statusFilter = ref<AppointmentStatus | 'all'>('all')
const isLoading = ref(false)
const isModalOpen = ref(false)
const errorMessage = ref('')
const editingAppointment = ref<Appointment | null>(null)
const form = ref({ patientId: '', doctorId: '', startsAt: '', endsAt: '', status: 'scheduled' as AppointmentStatus, notes: '' })

const isCalendarOpen = ref(false)
const isCalendarLoading = ref(false)
const calendarMonth = ref(new Date(`${selectedDate.value}T12:00:00`))
const calendarAppointments = ref<Appointment[]>([])
const weekdayLabels = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

const statusMeta: Record<AppointmentStatus, { label: string; class: string }> = {
  scheduled: { label: 'مجدول', class: 'bg-blue-500/12 text-blue-700 dark:text-blue-300' },
  arrived: { label: 'حضر', class: 'bg-amber-500/12 text-amber-700 dark:text-amber-300' },
  completed: { label: 'مكتمل', class: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'ملغي', class: 'bg-rose-500/12 text-rose-700 dark:text-rose-300' },
}

const visibleAppointments = computed(() => statusFilter.value === 'all'
  ? appointments.value
  : appointments.value.filter((appointment) => appointment.status === statusFilter.value))

const dayLabel = computed(() => new Intl.DateTimeFormat('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate.value}T12:00:00`)))

const calendarMonthLabel = computed(() => new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(calendarMonth.value))

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const appointmentsByDate = computed(() => {
  const map = new Map<string, Appointment[]>()
  for (const appointment of calendarAppointments.value) {
    const key = toLocalDateKey(new Date(appointment.starts_at))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(appointment)
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
      days.push({ date: new Date(cursor), key, inMonth: cursor.getMonth() === month, count: appointmentsByDate.value.get(key)?.length ?? 0 })
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

function appointmentTime(appointment: Appointment) {
  return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(appointment.starts_at))
}

function moveDay(amount: number) {
  const date = new Date(`${selectedDate.value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  selectedDate.value = date.toISOString().slice(0, 10)
}

function openCreateModal() {
  const start = new Date(`${selectedDate.value}T09:00:00`)
  const end = new Date(start.getTime() + 30 * 60_000)
  editingAppointment.value = null
  form.value = { patientId: '', doctorId: '', startsAt: localDateTime(start), endsAt: localDateTime(end), status: 'scheduled', notes: '' }
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEditModal(appointment: Appointment) {
  editingAppointment.value = appointment
  form.value = { patientId: String(appointment.patient_id), doctorId: appointment.doctor_id === null ? '' : String(appointment.doctor_id), startsAt: localDateTime(new Date(appointment.starts_at)), endsAt: localDateTime(new Date(appointment.ends_at)), status: appointment.status, notes: appointment.notes }
  errorMessage.value = ''
  isModalOpen.value = true
}

async function loadSchedule() {
  isLoading.value = true
  try {
    const from = new Date(`${selectedDate.value}T00:00:00`).toISOString()
    const to = new Date(`${selectedDate.value}T00:00:00`)
    to.setDate(to.getDate() + 1)
    appointments.value = await window.electronAPI.appointments.listForRange(from, to.toISOString())
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل جدول المواعيد.'
  } finally {
    isLoading.value = false
  }
}

async function loadPatients() {
  patients.value = await window.electronAPI.patients.list()
}

async function loadDoctors() {
  doctors.value = await window.electronAPI.doctors.list()
}

async function loadCalendarMonth() {
  isCalendarLoading.value = true
  try {
    const from = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth(), 1)
    const to = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1)
    calendarAppointments.value = await window.electronAPI.appointments.listForRange(from.toISOString(), to.toISOString())
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

async function saveAppointment() {
  if (!form.value.patientId || !form.value.doctorId || !form.value.startsAt || !form.value.endsAt) {
    errorMessage.value = 'اختر المراجع والطبيب ووقت بداية ونهاية الموعد.'
    return
  }
  const startsAt = new Date(form.value.startsAt)
  const endsAt = new Date(form.value.endsAt)
  if (endsAt <= startsAt) {
    errorMessage.value = 'يجب أن يكون وقت الانتهاء بعد وقت البداية.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    const doctorId = Number(form.value.doctorId)
    const input = {
      patient_id: Number(form.value.patientId),
      doctor_id: doctorId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: form.value.status,
      notes: form.value.notes.trim(),
    }
    if (editingAppointment.value) {
      await window.electronAPI.appointments.update(editingAppointment.value.id, input)
    } else {
      await window.electronAPI.appointments.create(input)
    }
    isModalOpen.value = false
    await loadSchedule()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الموعد.'
  } finally {
    isLoading.value = false
  }
}

async function deleteAppointment() {
  if (!editingAppointment.value || !window.confirm('حذف هذا الموعد نهائياً؟')) return
  isLoading.value = true
  try {
    await window.electronAPI.appointments.delete(editingAppointment.value.id)
    isModalOpen.value = false
    await loadSchedule()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف الموعد.'
  } finally {
    isLoading.value = false
  }
}

watch(selectedDate, loadSchedule)
onMounted(async () => { await Promise.all([loadSchedule(), loadPatients(), loadDoctors()]) })
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="text-sm font-medium text-primary">جدولة اليوم</p><h1 class="mt-1 text-2xl font-bold text-highlighted">المواعيد</h1><p class="mt-1 text-sm text-muted">نظرة واضحة على حركة العيادة ومتابعة حالة كل زيارة.</p></div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-calendar-days" label="عرض التقويم" color="neutral" variant="outline" @click="openCalendar" />
        <UButton icon="i-lucide-calendar-plus" label="موعد جديد" :disabled="!patients.length || !doctors.length" @click="openCreateModal" />
      </div>
    </header>

    <div class="flex flex-col gap-3 border border-default bg-elevated/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-1"><UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" aria-label="اليوم السابق" @click="moveDay(-1)" /><UInput v-model="selectedDate" type="date" class="w-42" /><UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="اليوم التالي" @click="moveDay(1)" /><UButton color="neutral" variant="soft" label="اليوم" @click="selectedDate = new Date().toISOString().slice(0, 10)" /></div>
      <p class="font-semibold text-highlighted">{{ dayLabel }}</p>
      <USelect v-model="statusFilter" :items="[{ label: 'كل الحالات', value: 'all' }, ...Object.entries(statusMeta).map(([value, meta]) => ({ label: meta.label, value }))]" class="w-full sm:w-36" />
    </div>

    <div v-if="(!patients.length || !doctors.length) && !isLoading" class="border border-dashed border-default p-10 text-center"><p class="font-semibold text-highlighted">{{ !patients.length ? 'أضف مراجعاً أولاً' : 'أضف طبيباً وجدول تواجده أولاً' }}</p><p class="mt-1 text-sm text-muted">لا يمكن إنشاء موعد دون سجل مراجع وطبيب متاح.</p><UButton :to="!patients.length ? '/patients' : '/settings/doctors'" class="mt-4" :label="!patients.length ? 'الذهاب إلى المراجعين' : 'إدارة الأطباء'" /></div>
    <div v-else class="overflow-hidden border border-default bg-default shadow-sm">
      <div class="flex items-center justify-between border-b border-default bg-elevated/35 px-5 py-3"><span class="text-sm font-semibold text-highlighted">{{ visibleAppointments.length }} موعد</span><span class="text-xs text-muted">عرض اليوم</span></div>
      <div v-if="isLoading" class="flex min-h-56 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div>
      <div v-else-if="!visibleAppointments.length" class="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center"><UIcon name="i-lucide-calendar-x-2" class="size-8 text-dimmed" /><p class="font-medium text-highlighted">لا توجد مواعيد بهذا اليوم</p><p class="text-sm text-muted">الجدول متاح لإضافة موعد جديد.</p></div>
      <div v-else class="divide-y divide-default">
        <button v-for="appointment in visibleAppointments" :key="appointment.id" class="grid w-full grid-cols-[5.75rem_1fr_auto] items-center gap-4 px-5 py-4 text-right transition-colors hover:bg-elevated/35" @click="openEditModal(appointment)">
          <span class="font-semibold text-highlighted" dir="ltr">{{ appointmentTime(appointment) }}</span>
          <span><span class="block font-semibold text-highlighted">{{ appointment.patient_name }}</span><span class="mt-0.5 block text-xs text-muted">{{ appointment.doctor_name ? `د. ${appointment.doctor_name}` : 'طبيب غير محدد' }} <span dir="ltr">{{ appointment.patient_phone }}</span></span></span>
          <span class="rounded px-2.5 py-1 text-xs font-medium" :class="statusMeta[appointment.status].class">{{ statusMeta[appointment.status].label }}</span>
        </button>
      </div>
    </div>
    <p v-if="errorMessage && !isModalOpen" class="text-sm text-error">{{ errorMessage }}</p>

    <UModal v-model:open="isModalOpen" :title="editingAppointment ? 'تعديل الموعد' : 'موعد جديد'">
      <template #body><form class="space-y-4" @submit.prevent="saveAppointment">
        <UFormField label="المراجع" required><USelect v-model="form.patientId" :items="patients.map((patient) => ({ label: `${patient.full_name} - ${patient.phone}`, value: String(patient.id) }))" class="w-full" /></UFormField>
        <UFormField label="الطبيب" required><USelect v-model="form.doctorId" :items="doctors.map((doctor) => ({ label: doctor.display_name, value: String(doctor.id) }))" class="w-full" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2"><UFormField label="بداية الموعد" required><UInput v-model="form.startsAt" type="datetime-local" class="w-full" /></UFormField><UFormField label="نهاية الموعد" required><UInput v-model="form.endsAt" type="datetime-local" class="w-full" /></UFormField></div>
        <UFormField label="الحالة"><USelect v-model="form.status" :items="Object.entries(statusMeta).map(([value, meta]) => ({ label: meta.label, value }))" class="w-full" /></UFormField>
        <UFormField label="ملاحظات"><UTextarea v-model="form.notes" class="w-full" :rows="3" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
        <div class="flex justify-between gap-2 pt-2"><UButton v-if="editingAppointment" icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف الموعد" :loading="isLoading" @click="deleteAppointment" /><span class="flex gap-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" /><UButton type="submit" :loading="isLoading" :label="editingAppointment ? 'حفظ التعديلات' : 'إضافة الموعد'" /></span></div>
      </form></template>
    </UModal>

    <UModal v-model:open="isCalendarOpen" title="تقويم المواعيد" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" aria-label="الشهر السابق" @click="moveCalendarMonth(-1)" />
            <p class="text-lg font-semibold text-highlighted">{{ calendarMonthLabel }}</p>
            <UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="الشهر التالي" @click="moveCalendarMonth(1)" />
          </div>
          <div v-if="isCalendarLoading" class="flex min-h-72 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" /></div>
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
                <span v-if="day.count" class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{{ day.count }}</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>