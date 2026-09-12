<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Appointment, AppointmentStatus, Doctor, FinanceSummary, MedicalRecord } from '@/modules/clinic-data'

type VisitRow = MedicalRecord & { patient_name: string; patient_phone: string }

const router = useRouter()
const appointments = ref<Appointment[]>([])
const visits = ref<VisitRow[]>([])
const doctors = ref<Doctor[]>([])
const finance = ref<FinanceSummary>({ income: '0', expenses: '0' })
const isLoading = ref(true)
const errorMessage = ref('')
const today = new Date()
const rangeStart = new Date(today)
rangeStart.setDate(today.getDate() - 29)
rangeStart.setHours(0, 0, 0, 0)
const rangeEnd = new Date(today)
rangeEnd.setDate(today.getDate() + 8)
rangeEnd.setHours(23, 59, 59, 999)

const statusMeta: Record<AppointmentStatus, { label: string; color: string }> = {
  scheduled: { label: 'مجدول', color: '#2d7ff9' }, arrived: { label: 'حضر', color: '#e5a11a' },
  completed: { label: 'مكتمل', color: '#18a873' }, cancelled: { label: 'ملغى', color: '#d95757' },
}
const upcomingAppointments = computed(() => appointments.value.filter((appointment) => appointment.status === 'scheduled' && new Date(appointment.starts_at) >= new Date()).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 5))
const totalVisits = computed(() => visits.value.length)
const completedVisits = computed(() => appointments.value.filter((appointment) => appointment.status === 'completed').length)
const balance = computed(() => Number(finance.value.income) - Number(finance.value.expenses))
const totalAppointments = computed(() => appointments.value.length)
const statusCounts = computed(() => (Object.keys(statusMeta) as AppointmentStatus[]).map((status) => ({ status, ...statusMeta[status], count: appointments.value.filter((appointment) => appointment.status === status).length })))
const statusGradient = computed(() => {
  const total = Math.max(totalAppointments.value, 1)
  let start = 0
  return `conic-gradient(${statusCounts.value.map((item) => { const end = start + (item.count / total) * 360; const stop = `${item.color} ${start}deg ${end}deg`; start = end; return stop }).join(', ')})`
})
const dailyVisits = computed(() => {
  const rows = []
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    rows.push({ label: new Intl.DateTimeFormat('ar-SA', { weekday: 'short' }).format(date), count: visits.value.filter((visit) => visit.visit_date.slice(0, 10) === key).length })
  }
  return rows
})
const maxDailyVisits = computed(() => Math.max(...dailyVisits.value.map((day) => day.count), 1))
const trendPoints = computed(() => dailyVisits.value.map((day, index) => `${index * 16.66},${42 - (day.count / maxDailyVisits.value) * 34}`).join(' '))

function money(value: string | number) { return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(Number(value)) }
function time(value: string) { return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(value)) }
function open(path: string) { router.push(path) }

async function loadDashboard() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const [appointmentRows, visitRows, doctorRows, financeRow] = await Promise.all([
      window.electronAPI.appointments.listForRange(rangeStart.toISOString(), rangeEnd.toISOString()),
      window.electronAPI.medicalRecords.listForRange(rangeStart.toISOString(), rangeEnd.toISOString()),
      window.electronAPI.doctors.list(),
      window.electronAPI.finance.getSummary(monthStart.toISOString().slice(0, 10)),
    ])
    appointments.value = appointmentRows || []
    visits.value = visitRows || []
    doctors.value = doctorRows || []
    finance.value = financeRow || { income: '0', expenses: '0' }
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل مؤشرات العيادة.' } finally { isLoading.value = false }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="mx-auto w-full max-w-7xl space-y-6 pb-8">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-sm font-medium text-primary">نظرة تشغيلية</p><h1 class="mt-1 text-2xl font-bold text-highlighted">لوحة التحليلات</h1><p class="mt-1 text-sm text-muted">مؤشرات آخر 30 يوماً مع الزيارات القادمة وأداء فريق العيادة.</p></div><UButton icon="i-lucide-refresh-cw" label="تحديث البيانات" color="neutral" variant="soft" :loading="isLoading" @click="loadDashboard" /></header>
    <p v-if="errorMessage" class="border border-error/30 bg-error/5 p-3 text-sm text-error">{{ errorMessage }}</p>
    <div v-if="isLoading && !appointments.length" class="flex min-h-72 items-center justify-center text-muted"><UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" /></div>
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">إجمالي الزيارات</span><UIcon name="i-lucide-activity" class="size-5 text-primary" /></div><p class="mt-4 text-3xl font-bold text-highlighted">{{ totalVisits }}</p><p class="mt-1 text-xs text-muted">خلال آخر 30 يوماً</p></article><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">المواعيد القادمة</span><UIcon name="i-lucide-calendar-clock" class="size-5 text-primary" /></div><p class="mt-4 text-3xl font-bold text-highlighted">{{ upcomingAppointments.length }}</p><p class="mt-1 text-xs text-muted">في نطاق الأيام القادمة</p></article><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">زيارات مكتملة</span><UIcon name="i-lucide-circle-check" class="size-5 text-success" /></div><p class="mt-4 text-3xl font-bold text-highlighted">{{ completedVisits }}</p><p class="mt-1 text-xs text-muted">من أصل {{ totalAppointments }} موعداً</p></article><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">صافي هذا الشهر</span><UIcon name="i-lucide-wallet-cards" class="size-5 text-warning" /></div><p class="mt-4 text-2xl font-bold text-highlighted">{{ money(balance) }}</p><p class="mt-1 text-xs text-muted">الإيرادات بعد المصروفات</p></article></div>
      <div class="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><section class="border border-default bg-default p-5 shadow-sm"><div class="flex items-start justify-between"><div><h2 class="font-semibold text-highlighted">وتيرة الزيارات</h2><p class="mt-1 text-sm text-muted">آخر سبعة أيام</p></div><UBadge label="أسبوعي" color="primary" variant="subtle" /></div><div class="mt-6 h-48"><svg viewBox="0 0 100 48" preserveAspectRatio="none" class="h-36 w-full overflow-visible"><path d="M0 42H100" stroke="currentColor" class="text-default" stroke-width="0.35" /><path d="M0 25H100" stroke="currentColor" class="text-default" stroke-width="0.35" stroke-dasharray="1 2" /><polyline :points="trendPoints" fill="none" stroke="#2d7ff9" stroke-width="1.2" vector-effect="non-scaling-stroke" /><circle v-for="(day, index) in dailyVisits" :key="day.label + index" :cx="index * 16.66" :cy="42 - (day.count / maxDailyVisits) * 34" r="1.2" fill="#2d7ff9" /></svg><div class="grid grid-cols-7 text-center text-xs text-muted"><span v-for="(day, index) in dailyVisits" :key="day.label + index + '-label'">{{ day.label }}<strong class="mt-1 block text-highlighted">{{ day.count }}</strong></span></div></div></section><section class="border border-default bg-default p-5 shadow-sm"><h2 class="font-semibold text-highlighted">حالة المواعيد</h2><div class="mt-5 flex items-center gap-6"><div class="relative size-36 shrink-0 rounded-full" :style="{ background: statusGradient }"><div class="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-default"><strong class="text-2xl text-highlighted">{{ totalAppointments }}</strong><span class="text-xs text-muted">موعد</span></div></div><div class="min-w-0 flex-1 space-y-3"><div v-for="item in statusCounts" :key="item.status" class="flex items-center justify-between gap-3 text-sm"><span class="flex items-center gap-2 text-muted"><i class="size-2 rounded-full" :style="{ backgroundColor: item.color }" />{{ item.label }}</span><strong class="text-highlighted">{{ item.count }}</strong></div></div></div></section></div>
      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><section class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><div><h2 class="font-semibold text-highlighted">الزيارات القادمة</h2><p class="mt-1 text-sm text-muted">أقرب المواعيد المجدولة</p></div><UButton icon="i-lucide-arrow-left" label="كل المواعيد" color="neutral" variant="ghost" @click="open('/appointments')" /></div><div class="mt-4 divide-y divide-default"><button v-for="appointment in upcomingAppointments" :key="appointment.id" type="button" class="flex w-full items-center gap-4 py-3 text-right transition-colors hover:bg-elevated"><div class="flex size-11 shrink-0 flex-col items-center justify-center border border-primary/30 bg-primary/5 text-primary"><strong class="text-sm">{{ new Date(appointment.starts_at).getDate() }}</strong><span class="text-[10px]">{{ new Intl.DateTimeFormat('ar-SA', { month: 'short' }).format(new Date(appointment.starts_at)) }}</span></div><div class="min-w-0 flex-1"><p class="truncate font-medium text-highlighted">{{ appointment.patient_name }}</p><p class="mt-1 truncate text-xs text-muted">{{ appointment.doctor_name || 'بدون طبيب محدد' }} · {{ appointment.notes || 'زيارة متابعة' }}</p></div><time class="shrink-0 text-sm font-medium text-primary">{{ time(appointment.starts_at) }}</time></button><p v-if="!upcomingAppointments.length" class="py-8 text-center text-sm text-muted">لا توجد مواعيد قادمة.</p></div></section><section class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><div><h2 class="font-semibold text-highlighted">أطباء العيادة</h2><p class="mt-1 text-sm text-muted">توزيع الزيارات المسجلة</p></div><UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" aria-label="إدارة الأطباء" @click="open('/settings/doctors')" /></div><div class="mt-4 space-y-4"><div v-for="doctor in doctors" :key="doctor.id"><div class="mb-1 flex justify-between gap-3 text-sm"><span class="truncate text-highlighted">{{ doctor.display_name }}</span><span class="text-muted">{{ visits.filter((visit) => visit.doctor_id === doctor.id).length }}</span></div><div class="h-2 overflow-hidden bg-muted"><div class="h-full bg-primary transition-all" :style="{ width: `${Math.min(100, (visits.filter((visit) => visit.doctor_id === doctor.id).length / Math.max(totalVisits, 1)) * 100)}%` }" /></div></div><p v-if="!doctors.length" class="py-8 text-center text-sm text-muted">لا يوجد أطباء مسجلون بعد.</p></div></section></div>
    </template>
  </section>
</template>