<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { databaseQuery, type Appointment, type AppointmentStatus, type Doctor, type Patient } from '@/modules/clinic-data'

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
    appointments.value = await databaseQuery<Appointment>(`
            SELECT appointments.id, appointments.patient_id, appointments.doctor_id, patients.full_name AS patient_name, patients.phone AS patient_phone, doctors.display_name AS doctor_name,
             appointments.starts_at::text, appointments.ends_at::text, appointments.status, appointments.notes
            FROM appointments INNER JOIN patients ON patients.id = appointments.patient_id LEFT JOIN doctors ON doctors.id = appointments.doctor_id
      WHERE appointments.starts_at < $2 AND appointments.ends_at > $1
      ORDER BY appointments.starts_at ASC
    `, [from, to.toISOString()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل جدول المواعيد.'
  } finally {
    isLoading.value = false
  }
}

async function loadPatients() {
  patients.value = await databaseQuery<Patient>('SELECT id, full_name, phone, date_of_birth::text, notes, created_at::text FROM patients ORDER BY full_name')
}

async function loadDoctors() {
  doctors.value = await databaseQuery<Doctor>('SELECT id, user_id, display_name FROM doctors ORDER BY display_name')
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
    const availability = await databaseQuery<{ id: number }>(`
      SELECT id FROM doctor_availability
      WHERE doctor_id = $1
        AND day_of_week = EXTRACT(DOW FROM $2::timestamptz)::integer
        AND starts_at <= $2::timestamptz::time
        AND ends_at >= $3::timestamptz::time
      LIMIT 1
    `, [doctorId, startsAt.toISOString(), endsAt.toISOString()])
    if (!availability.length) {
      errorMessage.value = 'الطبيب غير متاح خلال الوقت المحدد.'
      return
    }
    const conflict = await databaseQuery<{ id: number }>(`
      SELECT id FROM appointments WHERE doctor_id = $1 AND status != 'cancelled' AND starts_at < $3 AND ends_at > $2${editingAppointment.value ? ' AND id != $4' : ''} LIMIT 1
    `, editingAppointment.value ? [doctorId, startsAt.toISOString(), endsAt.toISOString(), editingAppointment.value.id] : [doctorId, startsAt.toISOString(), endsAt.toISOString()])
    if (form.value.status !== 'cancelled' && conflict.length) {
      errorMessage.value = 'يوجد موعد نشط خلال هذا الوقت.'
      return
    }
    const values = [Number(form.value.patientId), doctorId, startsAt.toISOString(), endsAt.toISOString(), form.value.status, form.value.notes.trim()]
    if (editingAppointment.value) {
      await databaseQuery('UPDATE appointments SET patient_id = $1, doctor_id = $2, starts_at = $3, ends_at = $4, status = $5, notes = $6, updated_at = now() WHERE id = $7', [...values, editingAppointment.value.id])
    } else {
      await databaseQuery('INSERT INTO appointments (patient_id, doctor_id, starts_at, ends_at, status, notes) VALUES ($1, $2, $3, $4, $5, $6)', values)
    }
    isModalOpen.value = false
    await loadSchedule()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الموعد.'
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
      <UButton icon="i-lucide-calendar-plus" label="موعد جديد" :disabled="!patients.length || !doctors.length" @click="openCreateModal" />
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
        <div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" /><UButton type="submit" :loading="isLoading" :label="editingAppointment ? 'حفظ التعديلات' : 'إضافة الموعد'" /></div>
      </form></template>
    </UModal>
  </section>
</template>