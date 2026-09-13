<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth, type UserRole } from '@/modules/auth'
import { useRouter } from 'vue-router'
const router = useRouter(); const { currentUser } = useAuth(); const isSaving = ref(false); const errorMessage = ref('')
const form = ref({ username: '', password: '', role: 'nurse' as UserRole })
const roleLabels: Record<UserRole, string> = { doctor: 'طبيب', nurse: 'ممرض', lab: 'المختبر', pharmacy: 'الصيدلية', moderator: 'مشرف', admin: 'مدير النظام' }
const roleItems = computed(() => Object.entries(roleLabels).map(([value, label]) => ({ label, value })))
function goBack() { void router.push('/settings/users') }
async function saveUser() { if (!form.value.username.trim() || form.value.password.length < 6) { errorMessage.value = 'أدخل اسم مستخدم وكلمة مرور لا تقل عن 6 أحرف.'; return }; isSaving.value = true; errorMessage.value = ''; try { await window.electronAPI.auth.createUser(form.value.username, form.value.password, form.value.role); await router.push('/settings/users') } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'تعذر إنشاء المستخدم.' } finally { isSaving.value = false } }
onMounted(() => { if (currentUser.value?.role !== 'admin') void router.replace('/') })
</script>
<template><section class="mx-auto w-full max-w-2xl space-y-6"><header class="border-b border-default pb-5"><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" label="فريق العيادة" class="-me-2 mb-3" @click="goBack" /><h1 class="text-2xl font-bold text-highlighted">إضافة مستخدم</h1><p class="mt-2 text-sm text-muted">أنشئ حساب دخول وحدد دور عضو الفريق.</p></header><form class="space-y-5 border border-default bg-default p-5 shadow-sm sm:p-7" @submit.prevent="saveUser"><UFormField label="اسم المستخدم" required><UInput v-model="form.username" class="w-full" autofocus /></UFormField><UFormField label="كلمة المرور" required hint="6 أحرف على الأقل"><UInput v-model="form.password" type="password" class="w-full" /></UFormField><UFormField label="الدور" required><USelect v-model="form.role" :items="roleItems" class="w-full" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 border-t border-default pt-5"><UButton icon="i-lucide-x" color="neutral" variant="ghost" label="إلغاء" @click="goBack" /><UButton type="submit" icon="i-lucide-user-round-plus" :loading="isSaving" label="إنشاء الحساب" /></div></form></section></template>
