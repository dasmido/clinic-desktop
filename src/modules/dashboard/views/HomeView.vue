<script setup lang="ts">
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip, type ChartOptions } from 'chart.js'
import { computed, onMounted, ref } from 'vue'
import { Line, Pie } from 'vue-chartjs'
import { useRouter } from 'vue-router'
import type { Doctor, FinanceSummary, MedicalRecord, VisitStatus } from '@/modules/clinic-data'

type VisitRow = MedicalRecord & { patient_name: string; patient_phone: string }

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

const router = useRouter()
const visits = ref<VisitRow[]>([])
const doctors = ref<Doctor[]>([])
const finance = ref<FinanceSummary>({ income: '0', expenses: '0' })
const isLoading = ref(true)
const updatingVisitId = ref<number | null>(null)
const errorMessage = ref('')
const today = new Date()
const rangeStart = new Date(today)
rangeStart.setDate(today.getDate() - 29)
rangeStart.setHours(0, 0, 0, 0)
const rangeEnd = new Date(today)
rangeEnd.setDate(today.getDate() + 8)
rangeEnd.setHours(23, 59, 59, 999)

const statusMeta: Record<VisitStatus, { label: string; color: string }> = {
  scheduled: { label: 'مجدول', color: '#2d7ff9' }, arrived: { label: 'حضر', color: '#e5a11a' },
  completed: { label: 'مكتمل', color: '#18a873' }, cancelled: { label: 'ملغى', color: '#d95757' },
}
const upcomingVisits = computed(() => visits.value.filter((visit) => visit.status === 'scheduled' && new Date(visit.visit_date) >= new Date()).sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()).slice(0, 5))
const activeVisits = computed(() => visits.value.filter((visit) => visit.status !== 'completed' && new Date(visit.visit_date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate())).sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()).slice(0, 5))
const totalVisits = computed(() => visits.value.length)
const completedVisits = computed(() => visits.value.filter((visit) => visit.status === 'completed').length)
const balance = computed(() => Number(finance.value.income) - Number(finance.value.expenses))
const statusCounts = computed(() => (Object.keys(statusMeta) as VisitStatus[]).map((status) => ({ status, ...statusMeta[status], count: visits.value.filter((visit) => visit.status === status).length })))
const statusChartData = computed(() => ({
  labels: statusCounts.value.map((item) => item.label),
  datasets: [{
    data: statusCounts.value.map((item) => item.count),
    backgroundColor: statusCounts.value.map((item) => item.color),
    borderWidth: 0,
    hoverOffset: 6,
  }],
}))
const statusChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { rtl: true, textDirection: 'rtl' as const },
  },
}
const dailyVisits = computed(() => {
  const rows = []
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    rows.push({ label: new Intl.DateTimeFormat('ar-SA', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(date), count: visits.value.filter((visit) => visit.visit_date.slice(0, 10) === key).length })
  }
  return rows
})
const visitsLineChartData = computed(() => ({
  labels: dailyVisits.value.map((day) => day.label),
  datasets: [{
    label: 'الزيارات',
    data: dailyVisits.value.map((day) => day.count),
    borderColor: '#2d7ff9',
    backgroundColor: 'rgba(45, 127, 249, 0.12)',
    pointBackgroundColor: '#2d7ff9',
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2,
    fill: true,
    tension: 0.35,
  }],
}))
const visitsLineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: { rtl: true, textDirection: 'rtl' },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#71717a' } },
    y: { beginAtZero: true, ticks: { color: '#71717a', precision: 0 }, grid: { color: 'rgba(113, 113, 122, 0.16)' } },
  },
}

function money(value: string | number) { return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(Number(value)) }
function time(value: string) { return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(value)) }
function open(path: string) { router.push(path) }

async function markVisitStatus(visit: VisitRow, status: VisitStatus) {
  if (status === 'cancelled' && !window.confirm('هل تريد إلغاء هذه الزيارة؟')) return
  updatingVisitId.value = visit.id
  errorMessage.value = ''
  try {
    const updated = await window.electronAPI.medicalRecords.updateStatus(visit.id, status)
    visits.value = visits.value.map((item) => item.id === updated.id ? { ...item, status: updated.status } : item)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحديث حالة الزيارة.'
  } finally {
    updatingVisitId.value = null
  }
}

async function loadDashboard() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const [visitRows, doctorRows, financeRow] = await Promise.all([
      window.electronAPI.medicalRecords.listForRange(rangeStart.toISOString(), rangeEnd.toISOString()),
      window.electronAPI.doctors.list(),
      window.electronAPI.finance.getSummary(monthStart.toISOString().slice(0, 10)),
    ])
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
    <div v-if="isLoading && !visits.length" class="flex min-h-72 items-center justify-center text-muted"><UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" /></div>
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">إجمالي الزيارات</span><UIcon name="i-lucide-activity" class="size-5 text-primary" /></div><p class="mt-4 text-3xl font-bold text-highlighted">{{ totalVisits }}</p><p class="mt-1 text-xs text-muted">خلال آخر 30 يوماً</p></article><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">الزيارات القادمة</span><UIcon name="i-lucide-calendar-clock" class="size-5 text-primary" /></div><p class="mt-4 text-3xl font-bold text-highlighted">{{ upcomingVisits.length }}</p><p class="mt-1 text-xs text-muted">في نطاق الأيام القادمة</p></article><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">زيارات مكتملة</span><UIcon name="i-lucide-circle-check" class="size-5 text-success" /></div><p class="mt-4 text-3xl font-bold text-highlighted">{{ completedVisits }}</p><p class="mt-1 text-xs text-muted">من أصل {{ totalVisits }} زيارة</p></article><article class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-sm text-muted">صافي هذا الشهر</span><UIcon name="i-lucide-wallet-cards" class="size-5 text-warning" /></div><p class="mt-4 text-2xl font-bold text-highlighted">{{ money(balance) }}</p><p class="mt-1 text-xs text-muted">الإيرادات بعد المصروفات</p></article></div>
      <div class="grid min-w-0 gap-6 xl:grid-cols-[1.35fr_0.65fr]"><section class="min-w-0 overflow-hidden border border-default bg-default p-5 shadow-sm"><div class="flex items-start justify-between"><div><h2 class="font-semibold text-highlighted">وتيرة الزيارات</h2><p class="mt-1 text-sm text-muted">آخر سبعة أيام</p></div><UBadge label="أسبوعي" color="primary" variant="subtle" /></div><div class="relative mt-6 h-48 min-w-0 overflow-hidden"><Line :data="visitsLineChartData" :options="visitsLineChartOptions" aria-label="مخطط وتيرة الزيارات خلال آخر سبعة أيام" /></div></section><section class="min-w-0 border border-default bg-default p-5 shadow-sm"><h2 class="font-semibold text-highlighted">حالة الزيارات</h2><div class="mt-5 flex items-center gap-6"><div class="relative size-36 shrink-0"><Pie v-if="totalVisits" :data="statusChartData" :options="statusChartOptions" aria-label="مخطط حالات الزيارات" /><div v-else class="flex size-full items-center justify-center rounded-full border border-dashed border-default text-xs text-muted">لا توجد بيانات</div></div><div class="min-w-0 flex-1 space-y-3"><div v-for="item in statusCounts" :key="item.status" class="flex items-center justify-between gap-3 text-sm"><span class="flex items-center gap-2 text-muted"><i class="size-2 rounded-full" :style="{ backgroundColor: item.color }" />{{ item.label }}</span><strong class="text-highlighted">{{ item.count }}</strong></div></div></div></section></div>
      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><section class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><div><h2 class="font-semibold text-highlighted">متابعة الزيارات</h2><p class="mt-1 text-sm text-muted">تسجيل الحضور وإكمال الزيارة</p></div><UButton icon="i-lucide-arrow-left" label="كل الزيارات" color="neutral" variant="ghost" @click="open('/appointments')" /></div><div class="mt-4 divide-y divide-default"><div v-for="visit in activeVisits" :key="visit.id" class="flex flex-wrap items-center gap-4 py-3"><div class="flex size-11 shrink-0 flex-col items-center justify-center border border-primary/30 bg-primary/5 text-primary"><strong class="text-sm">{{ new Date(visit.visit_date).getDate() }}</strong><span class="text-[10px]">{{ new Intl.DateTimeFormat('ar-SA', { month: 'short' }).format(new Date(visit.visit_date)) }}</span></div><div class="min-w-40 flex-1"><div class="flex items-center gap-2"><p class="truncate font-medium text-highlighted">{{ visit.patient_name }}</p><UBadge :label="statusMeta[visit.status].label" :color="visit.status === 'cancelled' ? 'error' : visit.status === 'arrived' ? 'warning' : 'primary'" variant="subtle" /></div><p class="mt-1 truncate text-xs text-muted">{{ visit.doctor_name || 'بدون طبيب محدد' }} · {{ visit.chief_complaint || 'زيارة متابعة' }}</p></div><time class="shrink-0 text-sm font-medium text-primary">{{ time(visit.visit_date) }}</time><div class="flex shrink-0 items-center gap-1"><UButton v-if="visit.status === 'scheduled'" icon="i-lucide-user-check" label="حضر المريض" size="sm" :loading="updatingVisitId === visit.id" @click="markVisitStatus(visit, 'arrived')" /><UButton v-else-if="visit.status === 'arrived'" icon="i-lucide-circle-check" label="إكمال الزيارة" color="success" size="sm" :loading="updatingVisitId === visit.id" @click="markVisitStatus(visit, 'completed')" /><UButton v-else icon="i-lucide-rotate-ccw" label="إعادة التنشيط" color="neutral" variant="soft" size="sm" :loading="updatingVisitId === visit.id" @click="markVisitStatus(visit, 'scheduled')" /><UButton v-if="visit.status !== 'cancelled'" icon="i-lucide-x" color="error" variant="ghost" size="sm" aria-label="إلغاء الزيارة" :disabled="updatingVisitId !== null" @click="markVisitStatus(visit, 'cancelled')" /></div></div><p v-if="!activeVisits.length" class="py-8 text-center text-sm text-muted">لا توجد زيارات نشطة اليوم أو في الأيام القادمة.</p></div></section><section class="border border-default bg-default p-5 shadow-sm"><div class="flex items-center justify-between"><div><h2 class="font-semibold text-highlighted">أطباء العيادة</h2><p class="mt-1 text-sm text-muted">توزيع الزيارات المسجلة</p></div><UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" aria-label="إدارة الأطباء" @click="open('/settings/doctors')" /></div><div class="mt-4 space-y-4"><div v-for="doctor in doctors" :key="doctor.id"><div class="mb-1 flex justify-between gap-3 text-sm"><span class="truncate text-highlighted">{{ doctor.display_name }}</span><span class="text-muted">{{ visits.filter((visit) => visit.doctor_id === doctor.id).length }}</span></div><div class="h-2 overflow-hidden bg-muted"><div class="h-full bg-primary transition-all" :style="{ width: `${Math.min(100, (visits.filter((visit) => visit.doctor_id === doctor.id).length / Math.max(totalVisits, 1)) * 100)}%` }" /></div></div><p v-if="!doctors.length" class="py-8 text-center text-sm text-muted">لا يوجد أطباء مسجلون بعد.</p></div></section></div>
    </template>
  </section>
</template>