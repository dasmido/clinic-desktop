<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isSaving = ref(false)
const errorMessage = ref('')
const form = ref({ fullName: '', phone: '', dateOfBirth: '', notes: '' })

function goBack() {
  void router.push('/patients')
}

function openDatePicker(event: MouseEvent) {
  const input = event.target as HTMLInputElement
  if (input.type === 'date' && typeof input.showPicker === 'function') {
    input.showPicker()
  }
}

async function savePatient() {
  const fullName = form.value.fullName.trim()
  const phone = form.value.phone.trim()
  if (!fullName || !phone) {
    errorMessage.value = 'الاسم ورقم الهاتف مطلوبان.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    await window.electronAPI.patients.create({
      full_name: fullName,
      phone,
      date_of_birth: form.value.dateOfBirth || null,
      notes: form.value.notes.trim(),
    })
    await router.push('/patients')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ بيانات المراجع.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="border-b border-default pb-5">
      <h1 class="mt-5 text-2xl font-bold text-highlighted">إضافة مراجع جديد</h1>
      <p class="mt-2 text-sm text-muted">أدخل بيانات التواصل الأساسية، ويمكنك إضافة التفاصيل الطبية لاحقاً من السجل الطبي.</p>
    </header>

    <form class="space-y-6 border border-default bg-default p-5 shadow-sm sm:p-7" @submit.prevent="savePatient">
      <div class="grid gap-5 sm:grid-cols-2">
        <UFormField label="الاسم الكامل" required :ui="{ label: 'inline-flex items-center gap-2' }">
          <template #label><UIcon name="i-lucide-user-round" class="size-4" /><span>الاسم الكامل</span></template>
          <UInput v-model="form.fullName" class="w-full" autofocus placeholder="مثال: أحمد محمد علي" />
        </UFormField>
        <UFormField label="رقم الهاتف" required :ui="{ label: 'inline-flex items-center gap-2' }">
          <template #label><UIcon name="i-lucide-phone" class="size-4" /><span>رقم الهاتف</span></template>
          <UInput v-model="form.phone" class="w-full" dir="ltr" placeholder="05xxxxxxxx" />
        </UFormField>
        <UFormField label="تاريخ الميلاد" :ui="{ label: 'inline-flex items-center gap-2' }">
          <template #label><UIcon name="i-lucide-calendar-days" class="size-4" /><span>تاريخ الميلاد</span></template>
          <UInput v-model="form.dateOfBirth" type="date" class="w-full" @click="openDatePicker" />
        </UFormField>
      </div>

      <UFormField label="ملاحظات إضافية" :ui="{ label: 'inline-flex items-center gap-2' }">
        <template #label>
          <UIcon name="i-lucide-notebook-text" class="size-4" />
          <span>ملاحظات إضافية</span>
        </template>
        <UTextarea v-model="form.notes" class="w-full" :rows="5" placeholder="أي معلومات تود حفظها مع بيانات المراجع" />
      </UFormField>

      <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

      <div class="flex flex-wrap justify-end gap-2 border-t border-default pt-5">
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" label="إلغاء" @click="goBack" />
        <UButton type="submit" icon="i-lucide-user-round-plus" :loading="isSaving" label="حفظ" />
      </div>
    </form>
  </section>
</template>
