<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { databaseQuery, type Doctor } from '@/modules/clinic-data'
import { useAuth, type AuthUser } from '@/modules/auth'

type Availability = { id: number; day_of_week: number; starts_at: string; ends_at: string }

const router = useRouter()
const { currentUser } = useAuth()
const users = ref<AuthUser[]>([])
const doctors = ref<Doctor[]>([])
const selectedDoctorId = ref('')
const availability = ref<Availability[]>([])
const errorMessage = ref('')
const isLoading = ref(false)
const profileName = ref('')
const slot = ref({ day: '0', startsAt: '09:00', endsAt: '17:00' })

const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const doctorAccounts = computed(() => users.value.filter((user) => user.role === 'doctor'))
const selectedDoctor = computed(() => doctors.value.find((doctor) => doctor.id === Number(selectedDoctorId.value)))
const doctorItems = computed(() => doctors.value.map((doctor) => ({ label: doctor.display_name, value: String(doctor.id) })))

async function loadData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [accountRows, doctorRows] = await Promise.all([
      window.electronAPI.auth.listUsers(),
      databaseQuery<Doctor>('SELECT id, user_id, display_name FROM doctors ORDER BY display_name'),
    ])
    users.value = accountRows
    doctors.value = doctorRows
    if (!selectedDoctorId.value && doctors.value.length) selectedDoctorId.value = String(doctors.value[0].id)
    await loadAvailability()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل إعدادات الأطباء.'
  } finally {
    isLoading.value = false
  }
}

async function loadAvailability() {
  if (!selectedDoctorId.value) {
    availability.value = []
    return
  }
  availability.value = await databaseQuery<Availability>('SELECT id, day_of_week, starts_at::text, ends_at::text FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week, starts_at', [Number(selectedDoctorId.value)])
}

async function addDoctorProfile() {
  const account = doctorAccounts.value.find((user) => user.id === Number(profileName.value))
  if (!account) return
  isLoading.value = true
  try {
    await databaseQuery('INSERT INTO doctors (user_id, display_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [account.id, account.username])
    profileName.value = ''
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر إضافة الطبيب.'
  } finally {
    isLoading.value = false
  }
}

async function addAvailability() {
  if (!selectedDoctorId.value || slot.value.endsAt <= slot.value.startsAt) {
    errorMessage.value = 'يجب أن يكون وقت الانتهاء بعد وقت البداية.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    await databaseQuery('INSERT INTO doctor_availability (doctor_id, day_of_week, starts_at, ends_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [Number(selectedDoctorId.value), Number(slot.value.day), slot.value.startsAt, slot.value.endsAt])
    await loadAvailability()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ وقت التواجد.'
  } finally {
    isLoading.value = false
  }
}

async function removeAvailability(id: number) {
  await databaseQuery('DELETE FROM doctor_availability WHERE id = $1', [id])
  await loadAvailability()
}

async function removeDoctor(doctor: Doctor) {
  if (!window.confirm(`حذف ملف د. ${doctor.display_name}؟ ستبقى مواعيده السابقة دون طبيب محدد.`)) return
  isLoading.value = true
  try {
    await databaseQuery('DELETE FROM doctors WHERE id = $1', [doctor.id])
    if (selectedDoctorId.value === String(doctor.id)) selectedDoctorId.value = ''
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف ملف الطبيب.'
  } finally {
    isLoading.value = false
  }
}

async function selectDoctor() { await loadAvailability() }

onMounted(async () => {
  if (currentUser.value?.role !== 'admin') {
    await router.replace('/')
    return
  }
  await loadData()
})
</script>

<template>
  <section class="mx-auto w-full max-w-5xl space-y-6">
    <header class="border-b border-default pb-5"><p class="text-sm font-medium text-primary">التغطية الطبية</p><h1 class="mt-1 text-2xl font-bold text-highlighted">الأطباء وأوقات التواجد</h1><p class="mt-1 text-sm text-muted">حدد ساعات عمل الطبيب التي يسمح النظام بالحجز خلالها.</p></header>
    <div class="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <section class="border border-default bg-default p-5 shadow-sm"><h2 class="font-semibold text-highlighted">إضافة طبيب للجدول</h2><p class="mt-1 text-sm text-muted">تظهر هنا حسابات المستخدمين بدور طبيب.</p><form class="mt-5 flex gap-2" @submit.prevent="addDoctorProfile"><USelect v-model="profileName" :items="doctorAccounts.filter((account) => !doctors.some((doctor) => doctor.user_id === account.id)).map((account) => ({ label: account.username, value: String(account.id) }))" placeholder="اختر حساب الطبيب" class="min-w-0 flex-1" /><UButton icon="i-lucide-plus" aria-label="إضافة الطبيب" type="submit" :disabled="!profileName" /></form><div class="mt-5 divide-y divide-default"><div v-for="doctor in doctors" :key="doctor.id" class="flex items-center justify-between py-3"><span class="font-medium text-highlighted">د. {{ doctor.display_name }}</span><div class="flex items-center gap-2"><span class="text-xs text-muted">{{ availability.filter((item) => item && doctor.id === selectedDoctor?.id).length }} أوقات ظاهرة</span><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف ملف الطبيب" @click="removeDoctor(doctor)" /></div></div><p v-if="!doctors.length" class="py-6 text-center text-sm text-muted">لا توجد ملفات أطباء بعد.</p></div></section>
      <section class="border border-default bg-default p-5 shadow-sm"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="font-semibold text-highlighted">ساعات التواجد الأسبوعية</h2><p class="mt-1 text-sm text-muted">يمكن إضافة أكثر من فترة في اليوم الواحد.</p></div><USelect v-model="selectedDoctorId" :items="doctorItems" placeholder="اختر طبيباً" class="w-full sm:w-52" @update:model-value="selectDoctor" /></div><form class="mt-5 grid gap-3 sm:grid-cols-[1fr_7rem_7rem_auto]" @submit.prevent="addAvailability"><USelect v-model="slot.day" :items="days.map((label, value) => ({ label, value: String(value) }))" /><UInput v-model="slot.startsAt" type="time" /><UInput v-model="slot.endsAt" type="time" /><UButton icon="i-lucide-plus" aria-label="إضافة وقت التواجد" type="submit" :disabled="!selectedDoctorId" /></form><div class="mt-5 divide-y divide-default"><div v-for="item in availability" :key="item.id" class="flex items-center justify-between py-3"><span class="font-medium text-highlighted">{{ days[item.day_of_week] }}</span><span class="text-sm text-toned" dir="ltr">{{ item.starts_at.slice(0, 5) }} - {{ item.ends_at.slice(0, 5) }}</span><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف وقت التواجد" @click="removeAvailability(item.id)" /></div><p v-if="selectedDoctorId && !availability.length" class="py-7 text-center text-sm text-muted">لم تتم إضافة أوقات تواجد لهذا الطبيب.</p></div></section>
    </div>
    <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
  </section>
</template>