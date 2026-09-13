<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Patient } from '@/modules/clinic-data'

const router = useRouter()
const patients = ref<Patient[]>([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const isFilterDrawerOpen = ref(false)
const errorMessage = ref('')
const editingPatient = ref<Patient | null>(null)
const form = ref({ fullName: '', phone: '', dateOfBirth: '', notes: '' })
const filters = ref({ name: '', phone: '' })

const filteredPatients = computed(() => {
  const name = filters.value.name.trim().toLocaleLowerCase('ar')
  const phone = filters.value.phone.trim()

  return patients.value.filter((patient) =>
    (!name || patient.full_name.toLocaleLowerCase('ar').includes(name)) &&
    (!phone || patient.phone.includes(phone)),
  )
})

const activeFilterCount = computed(() => Object.values(filters.value).filter((value) => value.trim()).length)

function resetFilters() {
  filters.value = { name: '', phone: '' }
}

function openDatePicker(event: MouseEvent) {
  const input = event.target as HTMLInputElement
  if (input.type === 'date' && typeof input.showPicker === 'function') {
    input.showPicker()
  }
}

function openCreatePage() {
  void router.push('/patients/new')
}

function openEditModal(patient: Patient) {
  editingPatient.value = patient
  form.value = {
    fullName: patient.full_name,
    phone: patient.phone,
    dateOfBirth: patient.date_of_birth ?? '',
    notes: patient.notes,
  }
  errorMessage.value = ''
  isModalOpen.value = true
}

async function loadPatients() {
  isLoading.value = true
  try {
    patients.value = await window.electronAPI.patients.list()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل بيانات المراجعين.'
  } finally {
    isLoading.value = false
  }
}

async function savePatient() {
  const fullName = form.value.fullName.trim()
  const phone = form.value.phone.trim()
  if (!fullName || !phone) {
    errorMessage.value = 'الاسم ورقم الهاتف مطلوبان.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    const input = { full_name: fullName, phone, date_of_birth: form.value.dateOfBirth || null, notes: form.value.notes.trim() }
    if (!editingPatient.value) return
    await window.electronAPI.patients.update(editingPatient.value.id, input)
    isModalOpen.value = false
    await loadPatients()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ بيانات المراجع.'
  } finally {
    isLoading.value = false
  }
}

async function deletePatient(patient = editingPatient.value) {
  if (!patient || !window.confirm(`حذف سجل ${patient.full_name} وجميع مواعيده وسجله الطبي؟`)) return
  isLoading.value = true
  try {
    await window.electronAPI.patients.delete(patient.id)
    isModalOpen.value = false
    await loadPatients()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف سجل المراجع.'
  } finally {
    isLoading.value = false
  }
}

function deletePatientFromCard(patient: Patient) {
  return deletePatient(patient)
}

onMounted(loadPatients)
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-4 pb-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">سجل العيادة</p>
        <h1 class="mt-1 text-2xl font-bold text-highlighted">المراجعين</h1>
        <p class="mt-1 text-sm text-muted">إدارة بيانات الاتصال والسجل الأساسي للمراجعين.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-sliders-horizontal" color="neutral" variant="outline" label="بحث متقدم" :trailing-icon="activeFilterCount ? 'i-lucide-circle-check' : undefined" @click="isFilterDrawerOpen = true" />
        <UButton icon="i-lucide-user-round-plus" label="مراجع جديد" @click="openCreatePage" />
      </div>
    </header>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-muted">{{ activeFilterCount ? `${activeFilterCount} فلاتر مفعلة` : 'استخدم البحث المتقدم لتصفية السجلات' }}</p>
      <p class="text-sm text-muted">{{ filteredPatients.length }} مراجع</p>
    </div>

    <div class="overflow-hidden border-[0.5px] border-default bg-default shadow-sm">
      <div v-if="isLoading && !patients.length" class="flex min-h-56 items-center justify-center text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      </div>
      <div v-else-if="!filteredPatients.length" class="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
        <UIcon name="i-lucide-users-round" class="size-8 text-dimmed" />
        <p class="font-medium text-highlighted">لا توجد نتائج</p>
        <p class="text-sm text-muted">أضف أول مراجع لبدء تنظيم مواعيد العيادة.</p>
      </div>
      <div v-else class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <article v-for="patient in filteredPatients" :key="patient.id" class="flex min-w-0 flex-col border-[0.5px] border-default bg-default p-4 transition-shadow hover:shadow-md">
          <div class="mt-2 flex justify-center">
            <UAvatar icon="i-lucide-user-round" size="xl" color="primary" variant="soft" :alt="patient.full_name" />
          </div>
          <div class="mt-4 min-w-0 text-center">
            <h2 class="truncate font-semibold text-highlighted" :title="patient.full_name">{{ patient.full_name }}</h2>
            <p class="mt-1 truncate text-sm text-toned" dir="ltr" :title="patient.phone">{{ patient.phone }}</p>
            <div class="mt-2 flex justify-center gap-1">
              <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="تعديل المراجع" @click="openEditModal(patient)" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" aria-label="حذف المراجع" :loading="isLoading" @click="deletePatientFromCard(patient)" />
            </div>
          </div>
          <dl class="mt-4 space-y-2 pt-3 text-sm">
            <div class="flex items-center justify-between gap-2">
              <dt class="text-muted">الميلاد</dt>
              <dd class="truncate text-highlighted">{{ patient.date_of_birth || '—' }}</dd>
            </div>
            <div class="flex items-start justify-between gap-2">
              <dt class="shrink-0 text-muted">ملاحظات</dt>
              <dd class="line-clamp-2 text-left text-muted" :title="patient.notes || undefined">{{ patient.notes || '—' }}</dd>
            </div>
          </dl>
          <UButton class="mt-4 w-full" icon="i-lucide-notebook-pen" label="السجل الطبي" :to="`/patients/${patient.id}/records`" />
        </article>
      </div>
    </div>

    <UDrawer v-model:open="isFilterDrawerOpen" direction="bottom" title="بحث متقدم">
      <template #content>
        <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="اسم المراجع" :ui="{ label: 'inline-flex items-center gap-2' }">
              <template #label><UIcon name="i-lucide-user-round" class="size-4" /><span>اسم المراجع</span></template>
              <UInput v-model="filters.name" placeholder="الاسم الكامل" class="h-11 w-full rounded-none" />
            </UFormField>
            <UFormField label="رقم الهاتف" :ui="{ label: 'inline-flex items-center gap-2' }">
              <template #label><UIcon name="i-lucide-phone" class="size-4" /><span>رقم الهاتف</span></template>
              <UInput v-model="filters.phone" placeholder="رقم الهاتف" class="h-11 w-full rounded-none" dir="ltr" />
            </UFormField>
          </div>
          <div class="mt-5 flex flex-wrap justify-end gap-2 pt-4">
            <UButton color="neutral" variant="ghost" label="مسح الفلاتر" :disabled="!activeFilterCount" @click="resetFilters" />
            <UButton icon="i-lucide-check" label="عرض النتائج" @click="isFilterDrawerOpen = false" />
          </div>
        </div>
      </template>
    </UDrawer>

    <UModal v-model:open="isModalOpen" title="تعديل بيانات المراجع">
      <template #body>
        <form class="space-y-4" @submit.prevent="savePatient">
          <UFormField label="الاسم الكامل" required :ui="{ label: 'inline-flex items-center gap-2' }">
            <template #label><UIcon name="i-lucide-user-round" class="size-4" /><span>الاسم الكامل</span></template>
            <UInput v-model="form.fullName" class="h-11 w-full rounded-none" autofocus />
          </UFormField>
          <UFormField label="رقم الهاتف" required :ui="{ label: 'inline-flex items-center gap-2' }">
            <template #label><UIcon name="i-lucide-phone" class="size-4" /><span>رقم الهاتف</span></template>
            <UInput v-model="form.phone" class="h-11 w-full rounded-none" dir="ltr" />
          </UFormField>
          <UFormField label="تاريخ الميلاد" :ui="{ label: 'inline-flex items-center gap-2' }">
            <template #label><UIcon name="i-lucide-calendar-days" class="size-4" /><span>تاريخ الميلاد</span></template>
            <UInput v-model="form.dateOfBirth" type="date" class="h-11 w-full rounded-none" @click="openDatePicker" />
          </UFormField>
          <UFormField label="ملاحظات" :ui="{ label: 'inline-flex items-center gap-2' }">
            <template #label><UIcon name="i-lucide-notebook-text" class="size-4" /><span>ملاحظات</span></template>
            <UTextarea v-model="form.notes" class="min-h-28 w-full rounded-none" :rows="3" />
          </UFormField>
          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
          <div class="flex justify-between gap-2 pt-2"><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف المراجع" :loading="isLoading" @click="deletePatient()" /><span class="flex gap-2"><UButton icon="i-lucide-x" color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" /><UButton type="submit" :loading="isLoading" label="حفظ" /></span></div>
        </form>
      </template>
    </UModal>
  </section>
</template>