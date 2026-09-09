<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { databaseQuery, type FinancialTransaction, type FinancialTransactionType, type InventoryItem } from '@/modules/clinic-data'

type FinanceSummary = { income: string; expenses: string }

const activeView = ref<'finance' | 'inventory'>('finance')
const transactions = ref<FinancialTransaction[]>([])
const inventoryItems = ref<InventoryItem[]>([])
const summary = ref<FinanceSummary>({ income: '0', expenses: '0' })
const isLoading = ref(false)
const errorMessage = ref('')
const isTransactionModalOpen = ref(false)
const isItemModalOpen = ref(false)
const isAdjustmentModalOpen = ref(false)
const editingItem = ref<InventoryItem | null>(null)
const adjustmentItem = ref<InventoryItem | null>(null)
const transactionForm = ref({ type: 'income' as FinancialTransactionType, category: '', description: '', amount: '', occurredOn: new Date().toISOString().slice(0, 10) })
const itemForm = ref({ name: '', sku: '', unit: 'قطعة', quantity: '', reorderLevel: '', unitCost: '' })
const adjustmentForm = ref({ quantityChange: '', reason: 'توريد', notes: '' })

const balance = computed(() => Number(summary.value.income) - Number(summary.value.expenses))
const lowStockItems = computed(() => inventoryItems.value.filter((item) => Number(item.quantity) <= Number(item.reorder_level)))
const recentTransactions = computed(() => transactions.value.slice(0, 8))

function money(value: string | number) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 }).format(Number(value))
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
    const [summaryRows, transactionRows, itemRows] = await Promise.all([
      databaseQuery<FinanceSummary>(`
        SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'), 0)::text AS income,
               COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'), 0)::text AS expenses
        FROM financial_transactions WHERE occurred_on >= $1
      `, [monthStart.toISOString().slice(0, 10)]),
      databaseQuery<FinancialTransaction>(`
        SELECT id, transaction_type, category, description, amount::text, occurred_on::text, created_at::text
        FROM financial_transactions ORDER BY occurred_on DESC, id DESC LIMIT 100
      `),
      databaseQuery<InventoryItem>(`
        SELECT id, name, sku, unit, quantity::text, reorder_level::text, unit_cost::text, created_at::text
        FROM inventory_items ORDER BY name
      `),
    ])
    summary.value = summaryRows[0] ?? { income: '0', expenses: '0' }
    transactions.value = transactionRows
    inventoryItems.value = itemRows
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل البيانات المالية والمخزون.'
  } finally {
    isLoading.value = false
  }
}

function openTransactionModal() {
  transactionForm.value = { type: 'income', category: '', description: '', amount: '', occurredOn: new Date().toISOString().slice(0, 10) }
  errorMessage.value = ''
  isTransactionModalOpen.value = true
}

function openItemModal(item?: InventoryItem) {
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

async function saveTransaction() {
  const form = transactionForm.value
  if (!form.category.trim() || !form.description.trim() || Number(form.amount) <= 0 || !form.occurredOn) {
    errorMessage.value = 'أدخل التصنيف والوصف والمبلغ وتاريخ العملية.'
    return
  }
  isLoading.value = true
  try {
    await databaseQuery(
      'INSERT INTO financial_transactions (transaction_type, category, description, amount, occurred_on) VALUES ($1, $2, $3, $4, $5)',
      [form.type, form.category.trim(), form.description.trim(), Number(form.amount), form.occurredOn],
    )
    isTransactionModalOpen.value = false
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ العملية المالية.'
  } finally {
    isLoading.value = false
  }
}

async function saveItem() {
  const form = itemForm.value
  if (!form.name.trim() || !form.unit.trim() || Number(form.reorderLevel || 0) < 0 || Number(form.unitCost || 0) < 0 || Number(form.quantity || 0) < 0) {
    errorMessage.value = 'أدخل اسم الصنف ووحدة القياس والكميات بقيم صحيحة.'
    return
  }
  isLoading.value = true
  try {
    if (editingItem.value) {
      await databaseQuery(
        'UPDATE inventory_items SET name = $1, sku = $2, unit = $3, reorder_level = $4, unit_cost = $5, updated_at = now() WHERE id = $6',
        [form.name.trim(), form.sku.trim() || null, form.unit.trim(), Number(form.reorderLevel || 0), Number(form.unitCost || 0), editingItem.value.id],
      )
    } else {
      const items = await databaseQuery<{ id: number }>(
        'INSERT INTO inventory_items (name, sku, unit, quantity, reorder_level, unit_cost) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [form.name.trim(), form.sku.trim() || null, form.unit.trim(), Number(form.quantity || 0), Number(form.reorderLevel || 0), Number(form.unitCost || 0)],
      )
      if (Number(form.quantity || 0) > 0 && items[0]) {
        await databaseQuery('INSERT INTO inventory_movements (inventory_item_id, quantity_change, reason) VALUES ($1, $2, $3)', [items[0].id, Number(form.quantity), 'رصيد افتتاحي'])
      }
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
    const updated = await databaseQuery<{ id: number }>(
      'UPDATE inventory_items SET quantity = quantity + $1, updated_at = now() WHERE id = $2 AND quantity + $1 >= 0 RETURNING id',
      [change, item.id],
    )
    if (!updated.length) throw new Error('لا يمكن أن تصبح كمية المخزون أقل من صفر.')
    await databaseQuery('INSERT INTO inventory_movements (inventory_item_id, quantity_change, reason, notes) VALUES ($1, $2, $3, $4)', [item.id, change, adjustmentForm.value.reason.trim() || 'تسوية', adjustmentForm.value.notes.trim()])
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
    await databaseQuery('DELETE FROM financial_transactions WHERE id = $1', [transaction.id])
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
    await databaseQuery('DELETE FROM inventory_items WHERE id = $1', [item.id])
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف صنف المخزون.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
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
      <div class="overflow-hidden border border-default bg-default shadow-sm"><div class="flex items-center justify-between border-b border-default bg-elevated/35 px-5 py-3"><h2 class="font-semibold text-highlighted">آخر العمليات</h2><span class="text-xs text-muted">{{ transactions.length }} عملية</span></div><div v-if="isLoading" class="flex min-h-48 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div><div v-else-if="!transactions.length" class="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center"><UIcon name="i-lucide-receipt-text" class="size-8 text-dimmed" /><p class="font-medium text-highlighted">لا توجد عمليات مسجلة</p><p class="text-sm text-muted">ابدأ بتسجيل إيراد زيارة أو مصروف تشغيلي.</p></div><div v-else class="divide-y divide-default"><div v-for="transaction in recentTransactions" :key="transaction.id" class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-4"><UIcon :name="transaction.transaction_type === 'income' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'" class="size-5" :class="transaction.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'" /><div><p class="font-semibold text-highlighted">{{ transaction.description }}</p><p class="mt-0.5 text-xs text-muted">{{ transaction.category }} · {{ date(transaction.occurred_on) }}</p></div><p class="font-semibold" dir="ltr" :class="transaction.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'">{{ transaction.transaction_type === 'income' ? '+' : '-' }}{{ money(transaction.amount) }}</p><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف العملية" @click="deleteTransaction(transaction)" /></div></div></div>
    </template>

    <template v-else>
      <div v-if="lowStockItems.length" class="border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"><span class="font-semibold">تنبيه مخزون:</span> {{ lowStockItems.map((item) => item.name).join('، ') }} وصل إلى حد إعادة الطلب أو أقل.</div>
      <div class="overflow-hidden border border-default bg-default shadow-sm"><div v-if="isLoading" class="flex min-h-56 items-center justify-center"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" /></div><div v-else-if="!inventoryItems.length" class="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center"><UIcon name="i-lucide-package-search" class="size-8 text-dimmed" /><p class="font-medium text-highlighted">لا توجد أصناف مخزون</p><UButton class="mt-2" icon="i-lucide-package-plus" label="إضافة أول صنف" @click="openItemModal()" /></div><div v-else class="overflow-x-auto"><table class="w-full min-w-180 text-right text-sm"><thead class="border-b border-default bg-elevated/55 text-xs font-medium text-muted"><tr><th class="px-5 py-3">الصنف</th><th class="px-5 py-3">المتاح</th><th class="px-5 py-3">حد الطلب</th><th class="px-5 py-3">تكلفة الوحدة</th><th class="w-36 px-3 py-3"></th></tr></thead><tbody class="divide-y divide-default"><tr v-for="item in inventoryItems" :key="item.id" class="transition-colors hover:bg-elevated/35"><td class="px-5 py-4"><p class="font-semibold text-highlighted">{{ item.name }}</p><p v-if="item.sku" class="mt-0.5 text-xs text-muted" dir="ltr">{{ item.sku }}</p></td><td class="px-5 py-4 font-semibold" :class="Number(item.quantity) <= Number(item.reorder_level) ? 'text-amber-700 dark:text-amber-300' : 'text-highlighted'">{{ number(item.quantity) }} {{ item.unit }}</td><td class="px-5 py-4 text-muted">{{ number(item.reorder_level) }} {{ item.unit }}</td><td class="px-5 py-4 text-muted">{{ money(item.unit_cost) }}</td><td class="px-3 py-3"><div class="flex gap-1"><UButton icon="i-lucide-arrow-left-right" color="neutral" variant="ghost" aria-label="تسجيل حركة مخزون" @click="openAdjustmentModal(item)" /><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="تعديل الصنف" @click="openItemModal(item)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="حذف الصنف" @click="deleteItem(item)" /></div></td></tr></tbody></table></div></div>
    </template>
    <p v-if="errorMessage && !isTransactionModalOpen && !isItemModalOpen && !isAdjustmentModalOpen" class="text-sm text-error">{{ errorMessage }}</p>

    <UModal v-model:open="isTransactionModalOpen" title="تسجيل عملية مالية"><template #body><form class="space-y-4" @submit.prevent="saveTransaction"><UFormField label="نوع العملية"><USelect v-model="transactionForm.type" :items="[{ label: 'إيراد', value: 'income' }, { label: 'مصروف', value: 'expense' }]" class="w-full" /></UFormField><UFormField label="التصنيف" required><UInput v-model="transactionForm.category" placeholder="مثل: كشف، رواتب، مستلزمات" class="w-full" autofocus /></UFormField><UFormField label="الوصف" required><UInput v-model="transactionForm.description" class="w-full" /></UFormField><div class="grid gap-4 sm:grid-cols-2"><UFormField label="المبلغ (ر.س)" required><UInput v-model="transactionForm.amount" type="number" min="0.01" step="0.01" class="w-full" /></UFormField><UFormField label="التاريخ" required><UInput v-model="transactionForm.occurredOn" type="date" class="w-full" /></UFormField></div><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isTransactionModalOpen = false" /><UButton type="submit" :loading="isLoading" label="تسجيل العملية" /></div></form></template></UModal>
    <UModal v-model:open="isItemModalOpen" :title="editingItem ? 'تعديل صنف المخزون' : 'صنف مخزون جديد'"><template #body><form class="space-y-4" @submit.prevent="saveItem"><UFormField label="اسم الصنف" required><UInput v-model="itemForm.name" class="w-full" autofocus /></UFormField><div class="grid gap-4 sm:grid-cols-2"><UFormField label="رمز الصنف"><UInput v-model="itemForm.sku" class="w-full" dir="ltr" /></UFormField><UFormField label="وحدة القياس" required><UInput v-model="itemForm.unit" class="w-full" /></UFormField></div><div class="grid gap-4 sm:grid-cols-3"><UFormField v-if="!editingItem" label="الكمية الافتتاحية"><UInput v-model="itemForm.quantity" type="number" min="0" step="0.01" class="w-full" /></UFormField><UFormField label="حد إعادة الطلب"><UInput v-model="itemForm.reorderLevel" type="number" min="0" step="0.01" class="w-full" /></UFormField><UFormField label="تكلفة الوحدة (ر.س)"><UInput v-model="itemForm.unitCost" type="number" min="0" step="0.01" class="w-full" /></UFormField></div><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isItemModalOpen = false" /><UButton type="submit" :loading="isLoading" :label="editingItem ? 'حفظ التعديلات' : 'إضافة الصنف'" /></div></form></template></UModal>
    <UModal v-model:open="isAdjustmentModalOpen" :title="adjustmentItem ? `حركة مخزون: ${adjustmentItem.name}` : 'حركة مخزون'"><template #body><form class="space-y-4" @submit.prevent="saveAdjustment"><p v-if="adjustmentItem" class="text-sm text-muted">المتاح حالياً: {{ number(adjustmentItem.quantity) }} {{ adjustmentItem.unit }}</p><UFormField label="تغير الكمية" required><UInput v-model="adjustmentForm.quantityChange" type="number" step="0.01" placeholder="موجب للتوريد، سالب للصرف" class="w-full" autofocus /></UFormField><UFormField label="سبب الحركة"><UInput v-model="adjustmentForm.reason" placeholder="مثل: توريد، استخدام، تلف" class="w-full" /></UFormField><UFormField label="ملاحظات"><UTextarea v-model="adjustmentForm.notes" class="w-full" :rows="2" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2 pt-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isAdjustmentModalOpen = false" /><UButton type="submit" :loading="isLoading" label="تسجيل الحركة" /></div></form></template></UModal>
  </section>
</template>