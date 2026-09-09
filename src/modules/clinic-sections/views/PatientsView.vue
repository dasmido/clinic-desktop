<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { databaseQuery, type Patient } from '@/modules/clinic-data'

const patients = ref<Patient[]>([])
const search = ref('')
const isLoading = ref(false)
const isModalOpen = ref(false)
const errorMessage = ref('')
const editingPatient = ref<Patient | null>(null)
const form = ref({ fullName: '', phone: '', dateOfBirth: '', notes: '' })

const filteredPatients = computed(() => {
  const phrase = search.value.trim().toLocaleLowerCase('ar')
  if (!phrase) return patients.value

  return patients.value.filter((patient) =>
    patient.full_name.toLocaleLowerCase('ar').includes(phrase) || patient.phone.includes(phrase),
  )
})

function openCreateModal() {
  editingPatient.value = null
  form.value = { fullName: '', phone: '', dateOfBirth: '', notes: '' }
  errorMessage.value = ''
  isModalOpen.value = true
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
    patients.value = await databaseQuery<Patient>(`
      SELECT id, full_name, phone, date_of_birth::text, notes, created_at::text
      FROM patients
      ORDER BY full_name ASC
    `)
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
    const values = [fullName, phone, form.value.dateOfBirth || null, form.value.notes.trim()]
    if (editingPatient.value) {
      await databaseQuery(
        `UPDATE patients SET full_name = $1, phone = $2, date_of_birth = $3, notes = $4, updated_at = now() WHERE id = $5`,
        [...values, editingPatient.value.id],
      )
    } else {
      await databaseQuery(
        `INSERT INTO patients (full_name, phone, date_of_birth, notes) VALUES ($1, $2, $3, $4)`,
        values,
      )
    }
    isModalOpen.value = false
    await loadPatients()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ بيانات المراجع.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPatients)
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">سجل العيادة</p>
        <h1 class="mt-1 text-2xl font-bold text-highlighted">المراجعين</h1>
        <p class="mt-1 text-sm text-muted">إدارة بيانات الاتصال والسجل الأساسي للمراجعين.</p>
      </div>
      <UButton icon="i-lucide-user-round-plus" label="مراجع جديد" @click="openCreateModal" />
    </header>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <UInput v-model="search" icon="i-lucide-search" placeholder="ابحث بالاسم أو رقم الهاتف" class="w-full sm:max-w-sm" />
      <p class="text-sm text-muted">{{ filteredPatients.length }} مراجع</p>
    </div>

    <div class="overflow-hidden border border-default bg-default shadow-sm">
      <div v-if="isLoading && !patients.length" class="flex min-h-56 items-center justify-center text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      </div>
      <div v-else-if="!filteredPatients.length" class="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
        <UIcon name="i-lucide-users-round" class="size-8 text-dimmed" />
        <p class="font-medium text-highlighted">لا توجد نتائج</p>
        <p class="text-sm text-muted">أضف أول مراجع لبدء تنظيم مواعيد العيادة.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-165 text-right text-sm">
          <thead class="border-b border-default bg-elevated/55 text-xs font-medium text-muted">
            <tr>
              <th class="px-5 py-3">المراجع</th><th class="px-5 py-3">الهاتف</th><th class="px-5 py-3">تاريخ الميلاد</th><th class="px-5 py-3">ملاحظات</th><th class="w-16 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="patient in filteredPatients" :key="patient.id" class="transition-colors hover:bg-elevated/35">
              <td class="px-5 py-4 font-semibold text-highlighted">{{ patient.full_name }}</td>
              <td class="px-5 py-4 text-toned" dir="ltr">{{ patient.phone }}</td>
              <td class="px-5 py-4 text-muted">{{ patient.date_of_birth || '—' }}</td>
              <td class="max-w-70 truncate px-5 py-4 text-muted">{{ patient.notes || '—' }}</td>
              <td class="px-3 py-3"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="تعديل المراجع" @click="openEditModal(patient)" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UModal v-model:open="isModalOpen" :title="editingPatient ? 'تعديل بيانات المراجع' : 'مراجع جديد'">
      <template #body>
        <form class="space-y-4" @submit.prevent="savePatient">
          <UFormField label="الاسم الكامل" required><UInput v-model="form.fullName" class="w-full" autofocus /></UFormField>
          <UFormField label="رقم الهاتف" required><UInput v-model="form.phone" class="w-full" dir="ltr" /></UFormField>
          <UFormField label="تاريخ الميلاد"><UInput v-model="form.dateOfBirth" type="date" class="w-full" /></UFormField>
          <UFormField label="ملاحظات"><UTextarea v-model="form.notes" class="w-full" :rows="3" /></UFormField>
          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
          <div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" /><UButton type="submit" :loading="isLoading" :label="editingPatient ? 'حفظ التعديلات' : 'إضافة المراجع'" /></div>
        </form>
      </template>
    </UModal>
  </section>
</template>