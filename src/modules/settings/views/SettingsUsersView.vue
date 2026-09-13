<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, type AuthUser, type UserRole } from '@/modules/auth'

const router = useRouter()
const { currentUser } = useAuth()
const users = ref<AuthUser[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

const roleLabels: Record<UserRole, string> = {
  doctor: 'طبيب',
  nurse: 'ممرض',
  lab: 'المختبر',
  pharmacy: 'الصيدلية',
  moderator: 'مشرف',
  admin: 'مدير النظام',
}

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
  void router.push('/settings/users/new')
}

async function deleteUser(user: AuthUser) {
  if (!window.confirm(`حذف حساب ${user.username}؟`)) return
  isLoading.value = true
  try {
    await window.electronAPI.auth.deleteUser(user.id)
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف حساب المستخدم.'
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
          <thead class="border-b border-default bg-elevated/55 text-xs font-medium text-muted"><tr><th class="px-5 py-3">المستخدم</th><th class="px-5 py-3">الدور</th><th class="px-5 py-3">الصلاحية</th><th class="w-16 px-3 py-3"></th></tr></thead>
          <tbody class="divide-y divide-default"><tr v-for="user in users" :key="user.id"><td class="px-5 py-4 font-semibold text-highlighted">{{ user.username }}</td><td class="px-5 py-4"><span class="inline-flex bg-elevated px-2.5 py-1 text-xs font-medium text-toned">{{ roleLabels[user.role] }}</span></td><td class="px-5 py-4 text-muted">{{ user.role === 'admin' ? 'إدارة المستخدمين والإعدادات' : 'الوصول التشغيلي للعيادة' }}</td><td class="px-3 py-3"><UButton v-if="user.id !== currentUser?.id" icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف المستخدم" @click="deleteUser(user)" /></td></tr></tbody>
        </table>
      </div>
    </div>
    <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

  </section>
</template>