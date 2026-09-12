<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/modules/auth'
import type { LabOrder, LabResult, LabResultInterpretation, MedicalRecord, Patient } from '@/modules/clinic-data'

const { currentUser } = useAuth()
const patients = ref<Patient[]>([])
const records = ref<MedicalRecord[]>([])
const orders = ref<LabOrder[]>([])
const results = ref<LabResult[]>([])
const selectedOrderId = ref<number | null>(null)
const selectedOrder = ref<LabOrder | null>(null)
const search = ref('')
const patientId = ref('')
const recordId = ref('')
const isOrderModalOpen = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const uploadedFileCount = ref(0)

const orderForm = ref({ testName: '', urgency: 'routine' as 'routine' | 'urgent', indication: '' })
const resultForm = ref({ testName: '', value: '', referenceRange: '', interpretation: '' as LabResultInterpretation, notes: '' })

const role = computed(() => currentUser.value?.role)
const canOrder = computed(() => role.value === 'doctor' || role.value === 'nurse' || role.value === 'admin')
const canRecordResults = computed(() => role.value === 'lab' || role.value === 'admin')
const canChangeStatus = computed(() => role.value === 'doctor' || role.value === 'nurse' || role.value === 'admin')
const canDelete = computed(() => role.value === 'doctor' || role.value === 'admin')

const filteredOrders = computed(() => {
  const phrase = search.value.trim().toLocaleLowerCase('ar')
  if (!phrase) return orders.value
  return orders.value.filter((order) =>
    [order.patient_name, order.test_name, order.ordered_by_name].some((value) => value.toLocaleLowerCase('ar').includes(phrase)),
  )
})

const patientItems = computed(() => patients.value.map((patient) => ({ label: `${patient.full_name} - ${patient.phone}`, value: String(patient.id) })))
const recordItems = computed(() => records.value.map((record) => ({ label: `${formatDate(record.visit_date)}${record.diagnosis ? ` - ${record.diagnosis}` : ''}`, value: String(record.id) })))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(order: LabOrder) {
  return order.result_status === 'pending' ? 'قيد الانتظار' : order.result_status === 'resulted' ? 'ظهرت النتيجة' : 'ملغى'
}

async function loadOrders() {
  orders.value = await window.electronAPI.labs.listOpenOrders()
  if (selectedOrderId.value && !orders.value.some((order) => order.id === selectedOrderId.value)) {
    selectedOrderId.value = null
    selectedOrder.value = null
    results.value = []
  }
}

async function selectOrder(order: LabOrder) {
  selectedOrderId.value = order.id
  selectedOrder.value = order
  uploadedFileCount.value = 0
  resultForm.value = { testName: order.test_name, value: '', referenceRange: '', interpretation: '', notes: '' }
  results.value = await window.electronAPI.labs.listResultsByOrder(order.id)
}

async function uploadResultFile() {
  if (!selectedOrder.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const files = await window.electronAPI.patientFiles.add(selectedOrder.value.medical_record_id)
    for (const file of files) {
      await window.electronAPI.medicalRecords.addAttachment({
        medical_record_id: selectedOrder.value.medical_record_id,
        original_name: file.originalName,
        stored_name: file.storedName,
        file_size_bytes: file.fileSizeBytes,
      })
    }
    uploadedFileCount.value += files.length
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر رفع ملف النتيجة.'
  } finally {
    isLoading.value = false
  }
}

async function loadRecords() {
  records.value = patientId.value ? (await window.electronAPI.medicalRecords.listByPatient(Number(patientId.value))).records : []
  if (!records.value.some((record) => String(record.id) === recordId.value)) recordId.value = ''
}

async function refresh() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await loadOrders()
    if (selectedOrderId.value) results.value = await window.electronAPI.labs.listResultsByOrder(selectedOrderId.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل طلبات الفحوصات.'
  } finally {
    isLoading.value = false
  }
}

function openOrderModal() {
  patientId.value = ''
  recordId.value = ''
  records.value = []
  orderForm.value = { testName: '', urgency: 'routine', indication: '' }
  errorMessage.value = ''
  isOrderModalOpen.value = true
}

async function createOrder() {
  if (!patientId.value || !recordId.value || !orderForm.value.testName.trim()) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    await window.electronAPI.labs.createOrder({
      medical_record_id: Number(recordId.value),
      patient_id: Number(patientId.value),
      test_name: orderForm.value.testName.trim(),
      urgency: orderForm.value.urgency,
      clinical_indication: orderForm.value.indication.trim(),
    })
    isOrderModalOpen.value = false
    await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر إنشاء طلب الفحص.'
  } finally {
    isLoading.value = false
  }
}

async function createResult() {
  if (!selectedOrder.value || !resultForm.value.testName.trim() || !resultForm.value.value.trim()) return
  const orderId = selectedOrder.value.id
  isLoading.value = true
  errorMessage.value = ''
  try {
    await window.electronAPI.labs.createResult(orderId, {
      patient_id: selectedOrder.value.patient_id,
      test_name: resultForm.value.testName.trim(),
      result_value: resultForm.value.value.trim(),
      reference_range: resultForm.value.referenceRange.trim(),
      interpretation: resultForm.value.interpretation,
      notes: resultForm.value.notes.trim(),
    })
    orders.value = orders.value.filter((order) => order.id !== orderId)
    selectedOrderId.value = null
    selectedOrder.value = null
    results.value = []
    uploadedFileCount.value = 0
    resultForm.value = { testName: '', value: '', referenceRange: '', interpretation: '', notes: '' }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تسجيل نتيجة الفحص.'
  } finally {
    isLoading.value = false
  }
}

async function cancelOrder() {
  if (!selectedOrder.value || !window.confirm(`إلغاء طلب فحص ${selectedOrder.value.test_name}؟`)) return
  isLoading.value = true
  try {
    await window.electronAPI.labs.updateStatus(selectedOrder.value.id, 'cancelled')
    await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر إلغاء طلب الفحص.'
  } finally {
    isLoading.value = false
  }
}

async function deleteOrder() {
  if (!selectedOrder.value || !window.confirm(`حذف طلب فحص ${selectedOrder.value.test_name}؟`)) return
  isLoading.value = true
  try {
    await window.electronAPI.labs.deleteOrder(selectedOrder.value.id)
    await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف طلب الفحص.'
  } finally {
    isLoading.value = false
  }
}

watch(patientId, loadRecords)
onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([loadOrders(), window.electronAPI.patients.list().then((rows) => { patients.value = rows })])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل صفحة المختبر.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">التشخيص المخبري</p>
        <h1 class="mt-1 text-2xl font-bold text-highlighted">الفحوصات والتحاليل</h1>
        <p class="mt-1 text-sm text-muted">متابعة طلبات المختبر وتسجيل النتائج وربطها بالمراجع.</p>
      </div>
      <UButton v-if="canOrder" icon="i-lucide-file-plus-2" label="طلب فحص جديد" @click="openOrderModal" />
    </header>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <UInput v-model="search" icon="i-lucide-search" placeholder="ابحث باسم المراجع أو الفحص" class="w-full sm:max-w-sm" />
      <div class="flex items-center gap-3 text-sm text-muted"><UBadge :label="String(filteredOrders.length)" color="warning" variant="subtle" /> طلب مفتوح</div>
    </div>

    <p v-if="errorMessage" class="border border-error/30 bg-error/5 p-3 text-sm text-error">{{ errorMessage }}</p>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <section class="overflow-hidden border border-default bg-default shadow-sm">
        <div v-if="isLoading && !orders.length" class="flex min-h-56 items-center justify-center text-muted"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" /></div>
        <div v-else-if="!filteredOrders.length" class="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center"><UIcon name="i-lucide-flask-conical" class="size-8 text-dimmed" /><p class="font-medium text-highlighted">لا توجد طلبات مفتوحة</p><p class="text-sm text-muted">ستظهر هنا الفحوصات التي تنتظر تسجيل نتيجتها.</p></div>
        <div v-else class="divide-y divide-default">
          <button v-for="order in filteredOrders" :key="order.id" type="button" class="w-full p-4 text-right transition-colors hover:bg-elevated" :class="selectedOrderId === order.id ? 'bg-elevated' : ''" @click="selectOrder(order)">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate font-semibold text-highlighted">{{ order.test_name }}</p><p class="mt-1 truncate text-sm text-toned">{{ order.patient_name }}</p></div><UBadge :label="order.urgency === 'urgent' ? 'عاجل' : 'روتيني'" :color="order.urgency === 'urgent' ? 'error' : 'neutral'" variant="subtle" /></div>
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span>{{ statusLabel(order) }}</span><span>{{ order.ordered_by_name }}</span><span>{{ formatDate(order.ordered_on) }}</span></div>
          </button>
        </div>
      </section>

      <section class="border border-default bg-default p-5 shadow-sm">
        <div v-if="!selectedOrder" key="empty-order" class="flex min-h-56 flex-col items-center justify-center text-center"><UIcon name="i-lucide-clipboard-list" class="size-8 text-dimmed" /><p class="mt-3 font-medium text-highlighted">اختر طلب فحص</p><p class="mt-1 text-sm text-muted">اعرض تفاصيل الطلب وسجّل النتيجة من هنا.</p></div>
        <div v-else :key="`order-${selectedOrder.id}`">
          <div class="flex items-start justify-between gap-3"><div><p class="text-sm text-muted">تفاصيل الطلب</p><h2 class="mt-1 text-xl font-semibold text-highlighted">{{ selectedOrder.test_name }}</h2><p class="mt-1 text-sm text-toned">{{ selectedOrder.patient_name }}</p></div><UBadge :label="selectedOrder.urgency === 'urgent' ? 'عاجل' : 'روتيني'" :color="selectedOrder.urgency === 'urgent' ? 'error' : 'neutral'" /></div>
          <dl class="mt-5 space-y-3 border-y border-default py-4 text-sm"><div class="flex justify-between gap-3"><dt class="text-muted">الطبيب/الطالب</dt><dd class="text-highlighted">{{ selectedOrder.ordered_by_name }}</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">تاريخ الطلب</dt><dd class="text-highlighted">{{ formatDate(selectedOrder.ordered_on) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">السبب السريري</dt><dd class="text-left text-toned">{{ selectedOrder.clinical_indication || '—' }}</dd></div></dl>
          <div class="mt-5"><h3 class="font-semibold text-highlighted">النتائج المسجلة</h3><div class="mt-3 divide-y divide-default"><div v-for="result in results" :key="result.id" class="py-3"><div class="flex items-start justify-between gap-2"><p class="font-medium text-highlighted">{{ result.test_name }}: {{ result.result_value }}</p><UBadge v-if="result.interpretation" :label="result.interpretation === 'normal' ? 'طبيعي' : result.interpretation === 'critical' ? 'حرج' : result.interpretation === 'high' ? 'مرتفع' : 'منخفض'" :color="result.interpretation === 'critical' ? 'error' : result.interpretation === 'normal' ? 'success' : 'warning'" variant="subtle" /></div><p class="mt-1 text-xs text-muted">{{ result.reference_range || 'لا يوجد مدى مرجعي' }} · {{ result.recorded_by_name }}</p><p v-if="result.notes" class="mt-1 text-sm text-toned">{{ result.notes }}</p></div><p v-if="!results.length" class="py-3 text-sm text-muted">لم تسجل نتيجة بعد.</p></div></div>
          <form v-if="canRecordResults" class="mt-5 space-y-3 border-t border-default pt-4" @submit.prevent="createResult"><h3 class="font-semibold text-highlighted">تسجيل نتيجة</h3><div class="grid gap-3 sm:grid-cols-2"><UInput v-model="resultForm.testName" placeholder="اسم التحليل" /><UInput v-model="resultForm.value" placeholder="النتيجة" /><UInput v-model="resultForm.referenceRange" placeholder="المدى المرجعي" /><USelect v-model="resultForm.interpretation" :items="[{ label: 'غير محدد', value: '' }, { label: 'طبيعي', value: 'normal' }, { label: 'منخفض', value: 'low' }, { label: 'مرتفع', value: 'high' }, { label: 'حرج', value: 'critical' }]" /></div><UTextarea v-model="resultForm.notes" placeholder="ملاحظات المختبر" /><div class="flex flex-wrap items-center gap-2"><UButton type="submit" icon="i-lucide-clipboard-check" label="حفظ النتيجة" :loading="isLoading" :disabled="!resultForm.testName.trim() || !resultForm.value.trim()" /><UButton type="button" icon="i-lucide-paperclip" label="رفع ملف النتيجة" color="neutral" variant="soft" :loading="isLoading" @click="uploadResultFile" /><span v-if="uploadedFileCount" class="text-xs text-success">تم رفع {{ uploadedFileCount }} ملف</span></div></form>
          <div v-if="canChangeStatus || canDelete" class="mt-5 flex flex-wrap gap-2 border-t border-default pt-4"><UButton v-if="canChangeStatus" icon="i-lucide-ban" label="إلغاء الطلب" color="neutral" variant="soft" :loading="isLoading" @click="cancelOrder" /><UButton v-if="canDelete" icon="i-lucide-trash-2" label="حذف الطلب" color="error" variant="ghost" :loading="isLoading" @click="deleteOrder" /></div>
        </div>
      </section>
    </div>

    <UModal v-model:open="isOrderModalOpen" title="طلب فحص جديد"><template #body><form class="space-y-4" @submit.prevent="createOrder"><UFormField label="المراجع" required><USelect v-model="patientId" :items="patientItems" placeholder="اختر مراجعاً" class="w-full" /></UFormField><UFormField label="الزيارة الموثقة" required><USelect v-model="recordId" :items="recordItems" placeholder="اختر زيارة" class="w-full" :disabled="!patientId" /></UFormField><UFormField label="اسم الفحص" required><UInput v-model="orderForm.testName" class="w-full" /></UFormField><UFormField label="الأولوية"><USelect v-model="orderForm.urgency" :items="[{ label: 'روتيني', value: 'routine' }, { label: 'عاجل', value: 'urgent' }]" class="w-full" /></UFormField><UFormField label="السبب السريري"><UTextarea v-model="orderForm.indication" class="w-full" /></UFormField><p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p><div class="flex justify-end gap-2"><UButton color="neutral" variant="ghost" label="إلغاء" @click="isOrderModalOpen = false" /><UButton type="submit" icon="i-lucide-flask-conical" label="إنشاء الطلب" :loading="isLoading" :disabled="!patientId || !recordId || !orderForm.testName.trim()" /></div></form></template></UModal>
  </section>
</template>