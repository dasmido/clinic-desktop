<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FinanceSummary, FinancialTransaction, InventoryItem } from '@/modules/clinic-data'
import { useAppSettings } from '@/modules/settings/composables/useAppSettings'

const { settings, loadSettings } = useAppSettings()
const router = useRouter()
const activeView = ref<'finance' | 'inventory'>('finance')
const transactions = ref<FinancialTransaction[]>([])
const inventoryItems = ref<InventoryItem[]>([])
const summary = ref<FinanceSummary>({ income: '0', expenses: '0' })
const isLoading = ref(false)
const errorMessage = ref('')
const isItemModalOpen = ref(false)
const isAdjustmentModalOpen = ref(false)
const editingItem = ref<InventoryItem | null>(null)
const adjustmentItem = ref<InventoryItem | null>(null)
const itemForm = ref({ name: '', sku: '', unit: 'قطعة', quantity: '', reorderLevel: '', unitCost: '' })
const adjustmentForm = ref({ quantityChange: '', reason: 'توريد', notes: '' })

const balance = computed(() => Number(summary.value.income) - Number(summary.value.expenses))
const lowStockItems = computed(() => inventoryItems.value.filter((item) => Number(item.quantity) <= Number(item.reorder_level)))
const recentTransactions = computed(() => transactions.value.slice(0, 8))

function money(value: string | number) {
  const currency = settings.value?.currency ?? 'USD'
  const locale = currency === 'IQD' ? 'ar-IQ' : 'en-US'
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value))
}

function number(value: string | number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(Number(value))
}

function date(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

async function loadData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const [summaryRow, transactionRows, itemRows] = await Promise.all([
      window.electronAPI.finance.getSummary(monthStart.toISOString().slice(0, 10)),
      window.electronAPI.finance.listTransactions(100),
      window.electronAPI.inventory.list(),
    ])
    summary.value = summaryRow ?? { income: '0', expenses: '0' }
    transactions.value = transactionRows
    inventoryItems.value = itemRows
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل البيانات المالية والمخزون.'
  } finally {
    isLoading.value = false
  }
}

function openTransactionModal() {
  void router.push('/finance/transactions/new')
}

function openItemModal(item?: InventoryItem) {
  if (!item) {
    void router.push('/finance/inventory/new')
    return
  }
  editingItem.value = item ?? null
  itemForm.value = item
    ? { name: item.name, sku: item.sku ?? '', unit: item.unit, quantity: '', reorderLevel: item.reorder_level, unitCost: item.unit_cost }
    : { name: '', sku: '', unit: 'قطعة', quantity: '', reorderLevel: '', unitCost: '' }
  errorMessage.value = ''
  isItemModalOpen.value = true
}

function openAdjustmentModal(item: InventoryItem) {
  adjustmentItem.value = item
  adjustmentForm.value = { quantityChange: '', reason: 'توريد', notes: '' }
  errorMessage.value = ''
  isAdjustmentModalOpen.value = true
}

async function saveItem() {
  const form = itemForm.value
  if (!form.name.trim() || !form.unit.trim() || Number(form.reorderLevel || 0) < 0 || Number(form.unitCost || 0) < 0) {
    errorMessage.value = 'أدخل اسم الصنف ووحدة القياس والكميات بقيم صحيحة.'
    return
  }
  isLoading.value = true
  try {
    if (editingItem.value) {
      await window.electronAPI.inventory.updateItem(editingItem.value.id, {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        unit: form.unit.trim(),
        reorder_level: Number(form.reorderLevel || 0),
        unit_cost: Number(form.unitCost || 0),
      })
    }
    isItemModalOpen.value = false
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ صنف المخزون. تأكد من عدم تكرار رمز الصنف.'
  } finally {
    isLoading.value = false
  }
}

async function saveAdjustment() {
  const item = adjustmentItem.value
  const change = Number(adjustmentForm.value.quantityChange)
  if (!item || !change || Number.isNaN(change)) {
    errorMessage.value = 'أدخل كمية موجبة للتوريد أو سالبة للصرف.'
    return
  }
  isLoading.value = true
  try {
    await window.electronAPI.inventory.adjustQuantity(item.id, change, adjustmentForm.value.reason.trim() || 'تسوية', adjustmentForm.value.notes.trim())
    isAdjustmentModalOpen.value = false
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تسجيل حركة المخزون.'
  } finally {
    isLoading.value = false
  }
}

async function deleteTransaction(transaction: FinancialTransaction) {
  if (!window.confirm(`حذف عملية ${transaction.description} نهائياً؟`)) return
  isLoading.value = true
  try {
    await window.electronAPI.finance.deleteTransaction(transaction.id)
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف العملية المالية.'
  } finally {
    isLoading.value = false
  }
}

async function deleteItem(item: InventoryItem) {
  if (!window.confirm(`حذف صنف ${item.name} وحركاته المسجلة؟`)) return
  isLoading.value = true
  try {
    await window.electronAPI.inventory.deleteItem(item.id)
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف صنف المخزون.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!settings.value) await loadSettings()
  await loadData()
})
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="text-sm font-medium text-primary">تشغيل العيادة</p><h1 class="mt-1 text-2xl font-bold text-highlighted">الحسابات والمخزون</h1><p class="mt-1 text-sm text-muted">سجل الإيرادات والمصروفات ومتابعة المستلزمات الطبية.</p></div>
      <div class="flex gap-2"><UButton icon="i-lucide-package-plus" color="neutral" variant="soft" label="صنف جديد" @click="openItemModal()" /><UButton icon="i-lucide-circle-dollar-sign" label="عملية مالية" @click="openTransactionModal" /></div>
    </header>

    <div class="flex border-b border-default" role="tablist"><button class="border-b-2 px-4 py-2 text-sm font-semibold" :class="activeView === 'finance' ? 'border-primary text-primary' : 'border-transparent text-muted'" @click="activeView = 'finance'">المالية</button><button class="border-b-2 px-4 py-2 text-sm font-semibold" :class="activeView === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-muted'" @click="activeView = 'inventory'">المخزون <span v-if="lowStockItems.length" class="ms-1 text-error">{{ lowStockItems.length }}</span></button></div>

    <template v-if="activeView === 'finance'">
      <div class="grid gap-3 sm:grid-cols-3"><div class="border border-default bg-default p-5"><p class="text-sm text-muted">إيرادات هذا الشهر</p><p class="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-300">{{ money(summary.income) }}</p></div><div class="border border-default bg-default p-5"><p class="text-sm text-muted">مصروفات هذا الشهر</p><p class="mt-2 text-xl font-bold text-rose-600 dark:text-rose-300">{{ money(summary.expenses) }}</p></div><div class="border border-default bg-default p-5"><p class="text-sm text-muted">صافي هذا الشهر</p><p class="mt-2 text-xl font-bold" :class="balance >= 0 ? 'text-highlighted' : 'text-rose-600 dark:text-rose-300'">{{ money(balance) }}</p></div></div>
      <div class="overflow-hidden border border-default bg-default shadow-sm"><div class="flex items-center justify-between border-b border-default bg-elevated/35 px-5 py-3"><h2 class="font-semibold text-highlighted">آخر العمليات</h2><span class="text-xs text-muted">{{ transactions.length }} عملية</span></div><div v-if="isLoading" class="flex min-h-48 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div><div v-else-if="!transactions.length" class="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center"><UIcon name="i-lucide-receipt-text" class="size-8 text-dimmed" /><p class="font-medium text-highlighted">لا توجد عمليات مسجلة</p><p class="text-sm text-muted">ابدأ بتسجيل إيراد زيارة أو مصروف تشغيلي.</p></div><div v-else class="divide-y divide-default"><div v-for="transaction in recentTransactions" :key="transaction.id" class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-4"><UIcon :name="transaction.transaction_type === 'income' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'" class="size-5" :class="transaction.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'" /><div><p class="font-semibold text-highlighted">{{ transaction.description }}</p><p class="mt-0.5 text-xs text-muted">{{ transaction.category }} · {{ date(transaction.occurred_on) }}<span v-if="transaction.patient_name"> · {{ transaction.patient_name }}</span></p></div><p class="font-semibold" dir="ltr" :class="transaction.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'">{{ transaction.transaction_type === 'income' ? '+' : '-' }}{{ money(transaction.amount) }}</p><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف العملية" @click="deleteTransaction(transaction)" /></div></div></div>
    </template>

    <template v-else>
      <div v-if="lowStockItems.length" class="border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"><span class="font-semibold">تنبيه مخزون:</span> {{ lowStockItems.map((item) => item.name).join('، ') }} وصل إلى حد إعادة الطلب أو أقل.</div>
      <div class="overflow-hidden border border-default bg-default shadow-sm"><div v-if="isLoading" class="flex min-h-56 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div><div v-else-if="!inventoryItems.length" class="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center"><UIcon name="i-lucide-package-search" class="size-8 text-dimmed" /><p class="font-medium text-highlighted">لا توجد أصناف مخزون</p><UButton class="mt-2" icon="i-lucide-package-plus" label="إضافة أول صنف" @click="openItemModal()" /></div><div v-else class="overflow-x-auto"><table class="w-full min-w-180 text-right text-sm"><thead class="border-b border-default bg-elevated/55 text-xs font-medium text-muted"><tr><th class="px-5 py-3">الصنف</th><th class="px-5 py-3">المتاح</th><th class="px-5 py-3">حد الطلب</th><th class="px-5 py-3">تكلفة الوحدة</th><th class="w-36 px-3 py-3"></th></tr></thead><tbody class="divide-y divide-default"><tr v-for="item in inventoryItems" :key="item.id" class="transition-colors hover:bg-elevated/35"><td class="px-5 py-4"><p class="font-semibold text-highlighted">{{ item.name }}</p><p v-if="item.sku" class="mt-0.5 text-xs text-muted" dir="ltr">{{ item.sku }}</p></td><td class="px-5 py-4 font-semibold" :class="Number(item.quantity) <= Number(item.reorder_level) ? 'text-amber-700 dark:text-amber-300' : 'text-highlighted'">{{ number(item.quantity) }} {{ item.unit }}</td><td class="px-5 py-4 text-muted">{{ number(item.reorder_level) }} {{ item.unit }}</td><td class="px-5 py-4 text-muted">{{ money(item.unit_cost) }}</td><td class="px-3 py-3"><div class="flex gap-1"><UButton icon="i-lucide-arrow-left-right" color="neutral" variant="ghost" aria-label="تسجيل حركة مخزون" @click="openAdjustmentModal(item)" /><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="تعديل الصنف" @click="openItemModal(item)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف الصنف" @click="deleteItem(item)" /></div></td></tr></tbody></table></div></div>
    </template>
    <p v-if="errorMessage && !isItemModalOpen && !isAdjustmentModalOpen" class="text-sm text-error">{{ errorMessage }}</p>

    <UModal v-if="editingItem" v-model:open="isItemModalOpen" title="تعديل صنف المخزون"><template #body><form class="space-y-4" @submit.prevent="saveItem"><UFormField label="اسم الصنف" required><UInput v-model="itemForm.name" class="w-full" autofocus /></UFormField><div class="grid gap-4 sm:grid-cols-2"><UFormField label="رمز الصنف"><UInput v-model="itemForm.sku" class="w-full" dir="ltr" /></UFormField><UFormField label="وحدة القياس" required><UInput v-model="itemForm.unit" class="w-full" /></UFormField></div><div class="grid gap-4 sm:grid-cols-2"><UFormField label="حد إعادة الطلب"><UInput v-model="itemForm.reorderLevel" type="number" min="0" step="0.01" class="w-full" /></UFormField><UFormField label="تكلفة الوحدة (د.ع)"><UInput v-model="itemForm.unitCost" type="number" min="0" step="0.01" class="w-full" /></UFormField></div><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isItemModalOpen = false" /><UButton type="submit" :loading="isLoading" label="حفظ التعديلات" /></div></form></template></UModal>
    <UModal v-model:open="isAdjustmentModalOpen" :title="adjustmentItem ? `حركة مخزون: ${adjustmentItem.name}` : 'حركة مخزون'"><template #body><form class="space-y-4" @submit.prevent="saveAdjustment"><p v-if="adjustmentItem" class="text-sm text-muted">المتاح حالياً: {{ number(adjustmentItem.quantity) }} {{ adjustmentItem.unit }}</p><UFormField label="تغير الكمية" required><UInput v-model="adjustmentForm.quantityChange" type="number" step="0.01" placeholder="موجب للتوريد، سالب للصرف" class="w-full" autofocus /></UFormField><UFormField label="سبب الحركة"><UInput v-model="adjustmentForm.reason" placeholder="مثل: توريد، استخدام، تلف" class="w-full" /></UFormField><UFormField label="ملاحظات"><UTextarea v-model="adjustmentForm.notes" class="w-full" :rows="2" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isAdjustmentModalOpen = false" /><UButton type="submit" :loading="isLoading" label="تسجيل الحركة" /></div></form></template></UModal>
  </section>
</template>