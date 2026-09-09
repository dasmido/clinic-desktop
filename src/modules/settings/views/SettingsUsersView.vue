<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, type AuthUser, type UserRole } from '@/modules/auth'

const router = useRouter()
const { currentUser } = useAuth()
const users = ref<AuthUser[]>([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const errorMessage = ref('')
const form = ref({ username: '', password: '', role: 'nurse' as UserRole })

const roleLabels: Record<UserRole, string> = {
  doctor: 'طبيب',
  nurse: 'ممرض',
  lab: 'المختبر',
  pharmacy: 'الصيدلية',
  moderator: 'مشرف',
  admin: 'مدير النظام',
}

const roleItems = computed(() => Object.entries(roleLabels).map(([value, label]) => ({ label, value })))

async function loadUsers() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    users.value = await window.electronAPI.auth.listUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل حسابات المستخدمين.'
  } finally {
    isLoading.value = false
  }
}

function openCreateModal() {
  form.value = { username: '', password: '', role: 'nurse' }
  errorMessage.value = ''
  isModalOpen.value = true
}

async function createUser() {
  if (!form.value.username.trim() || form.value.password.length < 6) {
    errorMessage.value = 'أدخل اسم مستخدم وكلمة مرور لا تقل عن 6 أحرف.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    await window.electronAPI.auth.createUser(form.value.username, form.value.password, form.value.role)
    isModalOpen.value = false
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر إنشاء المستخدم.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (currentUser.value?.role !== 'admin') {
    await router.replace('/')
    return
  }
  await loadUsers()
})
</script>

<template>
  <section class="mx-auto w-full max-w-5xl space-y-6">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">إدارة الوصول</p>
        <h1 class="mt-1 text-2xl font-bold text-highlighted">فريق العيادة</h1>
        <p class="mt-1 text-sm text-muted">إنشاء حسابات الدخول وتحديد دور كل عضو في النظام.</p>
      </div>
      <UButton icon="i-lucide-user-round-plus" label="إضافة مستخدم" @click="openCreateModal" />
    </header>

    <div class="overflow-hidden border border-default bg-default shadow-sm">
      <div v-if="isLoading && !users.length" class="flex min-h-56 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-130 text-right text-sm">
          <thead class="border-b border-default bg-elevated/55 text-xs font-medium text-muted"><tr><th class="px-5 py-3">المستخدم</th><th class="px-5 py-3">الدور</th><th class="px-5 py-3">الصلاحية</th></tr></thead>
          <tbody class="divide-y divide-default"><tr v-for="user in users" :key="user.id"><td class="px-5 py-4 font-semibold text-highlighted">{{ user.username }}</td><td class="px-5 py-4"><span class="inline-flex bg-elevated px-2.5 py-1 text-xs font-medium text-toned">{{ roleLabels[user.role] }}</span></td><td class="px-5 py-4 text-muted">{{ user.role === 'admin' ? 'إدارة المستخدمين والإعدادات' : 'الوصول التشغيلي للعيادة' }}</td></tr></tbody>
        </table>
      </div>
    </div>
    <p v-if="errorMessage && !isModalOpen" class="text-sm text-error">{{ errorMessage }}</p>

    <UModal v-model:open="isModalOpen" title="إضافة مستخدم">
      <template #body><form class="space-y-4" @submit.prevent="createUser">
        <UFormField label="اسم المستخدم" required><UInput v-model="form.username" class="w-full" autofocus /></UFormField>
        <UFormField label="كلمة المرور" required hint="6 أحرف على الأقل"><UInput v-model="form.password" type="password" class="w-full" /></UFormField>
        <UFormField label="الدور" required><USelect v-model="form.role" :items="roleItems" class="w-full" /></UFormField>
        <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
        <div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" /><UButton type="submit" :loading="isLoading" label="إنشاء الحساب" /></div>
      </form></template>
    </UModal>
  </section>
</template>