<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/modules/auth'
import type { MedicalRecord, Patient, Prescription, PrescriptionStatus } from '@/modules/clinic-data'

const { currentUser } = useAuth()
const patients = ref<Patient[]>([])
const allPrescriptions = ref<Prescription[]>([])
const records = ref<MedicalRecord[]>([])
const modalRecords = ref<MedicalRecord[]>([])
const prescriptions = ref<Prescription[]>([])

const patientId = ref('')
const recordId = ref('')
const onlyWithPrescriptions = ref(false)
const editingId = ref<number | null>(null)
const isModalOpen = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

type MedicineItem = {
  medicineName: string
  dosage: string
  frequency: string
  durationDays: string
  notes: string
}

type PrintTargetData = {
  patient: Patient | null
  doctorName: string
  visitDate: string
  diagnosis: string
  prescriptions: Prescription[]
}

const printSheetData = ref<PrintTargetData | null>(null)

const form = ref({
  patientId: '',
  recordId: '',
  medicines: [
    { medicineName: '', dosage: '', frequency: '', durationDays: '', notes: '' },
  ] as MedicineItem[],
  status: 'active' as PrescriptionStatus,
})

const canManage = computed(() => currentUser.value?.role === 'doctor' || currentUser.value?.role === 'admin')

type PatientPrescriptionSummary = {
  id: number
  full_name: string
  phone: string
  prescriptionsCount: number
  latestPrescription: Prescription
}

const patientsWithPrescriptionsMap = computed(() => {
  const map = new Map<number, PatientPrescriptionSummary>()
  for (const pres of allPrescriptions.value) {
    const pid = pres.patient_id
    if (!map.has(pid)) {
      const p = patients.value.find((item) => item.id === pid)
      map.set(pid, {
        id: pid,
        full_name: p?.full_name || pres.patient_name || `مراجع #${pid}`,
        phone: p?.phone || pres.patient_phone || '',
        prescriptionsCount: 0,
        latestPrescription: pres,
      })
    }
    const summary = map.get(pid)!
    summary.prescriptionsCount++
  }
  return map
})

const patientsWithPrescriptionsList = computed(() => Array.from(patientsWithPrescriptionsMap.value.values()))

const filteredPatients = computed(() => {
  if (!onlyWithPrescriptions.value) return patients.value
  const pids = new Set(patientsWithPrescriptionsMap.value.keys())
  return patients.value.filter((p) => pids.has(p.id))
})

const selectedPatient = computed(() => patients.value.find((patient) => patient.id === Number(patientId.value)) ?? null)

const patientItems = computed(() =>
  filteredPatients.value.map((patient) => {
    const count = patientsWithPrescriptionsMap.value.get(patient.id)?.prescriptionsCount || 0
    return {
      label: `${patient.full_name} - ${patient.phone}${count ? ` (${count} وصفات)` : ''}`,
      value: String(patient.id),
    }
  })
)

const modalPatientItems = computed(() =>
  patients.value.map((patient) => ({
    label: `${patient.full_name} - ${patient.phone}`,
    value: String(patient.id),
  }))
)

const recordItems = computed(() =>
  records.value.map((record) => ({
    label: `${formatDate(record.visit_date)}${record.diagnosis ? ' - ' + record.diagnosis : ''}`,
    value: String(record.id),
  }))
)

const modalRecordItems = computed(() =>
  modalRecords.value.map((record) => ({
    label: `${formatDate(record.visit_date)}${record.diagnosis ? ' - ' + record.diagnosis : ''}`,
    value: String(record.id),
  }))
)

type VisitPrescriptionsGroup = {
  recordId: number
  visitDate: string
  diagnosis: string
  doctorName: string
  items: Prescription[]
}

const groupedPrescriptions = computed<VisitPrescriptionsGroup[]>(() => {
  const filtered = recordId.value
    ? prescriptions.value.filter((p) => String(p.medical_record_id) === recordId.value)
    : prescriptions.value

  const map = new Map<number, VisitPrescriptionsGroup>()
  for (const pres of filtered) {
    const rid = pres.medical_record_id
    if (!map.has(rid)) {
      const rec = records.value.find((r) => r.id === rid)
      map.set(rid, {
        recordId: rid,
        visitDate: rec?.visit_date || pres.prescribed_on,
        diagnosis: rec?.diagnosis || '',
        doctorName: rec?.doctor_name || pres.prescribed_by_name || '',
        items: [],
      })
    }
    map.get(rid)!.items.push(pres)
  }
  return Array.from(map.values())
})

const statusItems = [
  { label: 'نشطة', value: 'active' },
  { label: 'تم الصرف', value: 'fulfilled' },
  { label: 'ملغاة', value: 'cancelled' },
]

function formatDate(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date(value))
}

function calculateAge(dob: string | null | undefined): string {
  if (!dob) return 'غير محدد'
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return 'غير محدد'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age > 0 ? `${age} سنة` : 'أقل من سنة'
}

function addMedicineRow() {
  form.value.medicines.push({
    medicineName: '',
    dosage: '',
    frequency: '',
    durationDays: '',
    notes: '',
  })
}

function removeMedicineRow(index: number) {
  if (form.value.medicines.length > 1) {
    form.value.medicines.splice(index, 1)
  }
}

function resetForm() {
  form.value = {
    patientId: patientId.value,
    recordId: recordId.value,
    medicines: [{ medicineName: '', dosage: '', frequency: '', durationDays: '', notes: '' }],
    status: 'active',
  }
}

const isFormValid = computed(() => {
  if (!form.value.patientId || !form.value.recordId) return false
  return form.value.medicines.some(
    (m) => m.medicineName.trim() && m.dosage.trim() && m.frequency.trim()
  )
})

async function fetchAllPrescriptions() {
  try {
    allPrescriptions.value = await window.electronAPI.prescriptions.listAll()
  } catch (err) {
    console.error('Failed to load all prescriptions:', err)
  }
}

async function loadPatientData() {
  const id = Number(patientId.value)
  records.value = []
  prescriptions.value = []
  recordId.value = ''
  if (!id) return
  const [medicalData, prescriptionRows] = await Promise.all([
    window.electronAPI.medicalRecords.listByPatient(id),
    window.electronAPI.prescriptions.listByPatient(id),
  ])
  records.value = medicalData.records
  prescriptions.value = prescriptionRows
}

async function loadModalRecords(targetPatientId: number) {
  modalRecords.value = []
  if (!targetPatientId) return
  const medicalData = await window.electronAPI.medicalRecords.listByPatient(targetPatientId)
  modalRecords.value = medicalData.records
}

async function refresh() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([fetchAllPrescriptions(), loadPatientData()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل الوصفات.'
  } finally {
    isLoading.value = false
  }
}

function selectPatient(id: number) {
  patientId.value = String(id)
}

function clearPatientSelection() {
  patientId.value = ''
  recordId.value = ''
  prescriptions.value = []
  records.value = []
}

async function openCreate() {
  editingId.value = null
  resetForm()
  const targetPatient = patientId.value || (patients.value.length > 0 ? String(patients.value[0].id) : '')
  form.value.patientId = targetPatient
  if (targetPatient) {
    await loadModalRecords(Number(targetPatient))
    if (recordId.value && modalRecords.value.some((r) => String(r.id) === recordId.value)) {
      form.value.recordId = recordId.value
    } else if (modalRecords.value.length > 0) {
      form.value.recordId = String(modalRecords.value[0].id)
    }
  }
  isModalOpen.value = true
}

async function openEdit(prescription: Prescription) {
  editingId.value = prescription.id
  form.value = {
    patientId: String(prescription.patient_id),
    recordId: String(prescription.medical_record_id),
    medicines: [
      {
        medicineName: prescription.medicine_name,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        durationDays: prescription.duration_days ? String(prescription.duration_days) : '',
        notes: prescription.notes,
      },
    ],
    status: prescription.status,
  }
  await loadModalRecords(prescription.patient_id)
  isModalOpen.value = true
}

watch(
  () => form.value.patientId,
  async (newVal) => {
    if (newVal) {
      await loadModalRecords(Number(newVal))
      if (!modalRecords.value.some((r) => String(r.id) === form.value.recordId)) {
        form.value.recordId = modalRecords.value.length > 0 ? String(modalRecords.value[0].id) : ''
      }
    } else {
      modalRecords.value = []
      form.value.recordId = ''
    }
  }
)

async function savePrescription() {
  const pid = Number(form.value.patientId)
  const rid = Number(form.value.recordId)
  const validMedicines = form.value.medicines.filter(
    (m) => m.medicineName.trim() && m.dosage.trim() && m.frequency.trim()
  )

  if (!pid || !rid || validMedicines.length === 0) {
    return
  }

  isLoading.value = true
  try {
    if (editingId.value) {
      const med = validMedicines[0]
      await window.electronAPI.prescriptions.update(editingId.value, {
        medicine_name: med.medicineName.trim(),
        dosage: med.dosage.trim(),
        frequency: med.frequency.trim(),
        duration_days: med.durationDays ? Number(med.durationDays) : null,
        notes: med.notes.trim(),
        status: form.value.status,
      })
    } else {
      await Promise.all(
        validMedicines.map((med) =>
          window.electronAPI.prescriptions.create({
            medical_record_id: rid,
            patient_id: pid,
            medicine_name: med.medicineName.trim(),
            dosage: med.dosage.trim(),
            frequency: med.frequency.trim(),
            duration_days: med.durationDays ? Number(med.durationDays) : null,
            notes: med.notes.trim(),
            status: form.value.status,
          })
        )
      )
    }
    isModalOpen.value = false
    patientId.value = String(pid)
    recordId.value = String(rid)
    await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الوصفة.'
  } finally {
    isLoading.value = false
  }
}

async function deletePrescription(prescription: Prescription) {
  if (!window.confirm(`حذف وصفة ${prescription.medicine_name}؟`)) return
  try {
    await window.electronAPI.prescriptions.delete(prescription.id)
    await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حذف الوصفة.'
  }
}

async function printVisitPrescriptions(visitRecordId: number, singlePrescription?: Prescription) {
  try {
    let pList: Prescription[] = []
    if (patientId.value) {
      pList = prescriptions.value.filter((p) => p.medical_record_id === visitRecordId)
    } else if (singlePrescription) {
      pList = await window.electronAPI.prescriptions.listByMedicalRecord(visitRecordId)
    }

    if (pList.length === 0 && singlePrescription) {
      pList = [singlePrescription]
    }

    const pat = selectedPatient.value || (singlePrescription ? patients.value.find((p) => p.id === singlePrescription.patient_id) || null : null)
    let rec = records.value.find((r) => r.id === visitRecordId)

    if (!rec && pat) {
      const medicalData = await window.electronAPI.medicalRecords.listByPatient(pat.id)
      rec = medicalData.records.find((r) => r.id === visitRecordId)
    }

    printSheetData.value = {
      patient: pat,
      doctorName: rec?.doctor_name || singlePrescription?.prescribed_by_name || currentUser.value?.username || '',
      visitDate: rec?.visit_date || singlePrescription?.prescribed_on || new Date().toISOString(),
      diagnosis: rec?.diagnosis || '',
      prescriptions: pList,
    }

    setTimeout(() => {
      window.print()
    }, 100)
  } catch (err) {
    console.error('Failed to print prescription sheet:', err)
  }
}

watch(patientId, refresh)

onMounted(async () => {
  isLoading.value = true
  try {
    patients.value = await window.electronAPI.patients.list()
    await fetchAllPrescriptions()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر تحميل المراجعين.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="prescription-page mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-col gap-3 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">الصيدلية السريرية</p>
        <h1 class="mt-1 text-2xl font-bold text-highlighted">الوصفات الطبية</h1>
        <p class="mt-1 text-sm text-muted">أنشئ وعدل واطبع الوصفات المرتبطة بزيارة موثقة.</p>
      </div>
      <UButton v-if="canManage" icon="i-lucide-plus" label="وصفة جديدة" @click="openCreate" />
    </header>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-end">
      <UFormField label="المراجع">
        <USelect v-model="patientId" :items="patientItems" placeholder="اختر مراجعاً لعرض وصفاته" class="w-full" />
      </UFormField>

      <UFormField v-if="patientId" label="الزيارة (تصفية حسب الزيارة)">
        <USelect v-model="recordId" :items="recordItems" placeholder="جميع الزيارات" class="w-full" />
      </UFormField>

      <div class="flex items-center gap-2 pb-1">
        <UButton
          :color="onlyWithPrescriptions ? 'primary' : 'neutral'"
          variant="outline"
          size="sm"
          :icon="onlyWithPrescriptions ? 'i-lucide-filter-x' : 'i-lucide-filter'"
          :label="onlyWithPrescriptions ? 'عرض جميع المراجعين' : 'تصفية: لديهم وصفات فقط'"
          @click="onlyWithPrescriptions = !onlyWithPrescriptions"
        />
        <UButton
          v-if="patientId"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          label="إلغاء تحديد المراجع"
          @click="clearPatientSelection"
        />
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

    <div v-if="isLoading" class="flex min-h-24 items-center justify-center">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
    </div>

    <!-- Mode 1: No patient selected -> List all patients who have prescriptions -->
    <div v-else-if="!patientId" class="space-y-4">
      <div class="flex items-center justify-between border-b border-default pb-3">
        <h2 class="text-lg font-semibold text-highlighted">
          المراجعون الذين لديهم وصفات طبية ({{ patientsWithPrescriptionsList.length }})
        </h2>
      </div>

      <div v-if="patientsWithPrescriptionsList.length === 0" class="border border-dashed border-default p-10 text-center text-sm text-muted">
        لا يوجد مراجعون لديهم وصفات طبية حالياً.
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="patientSummary in patientsWithPrescriptionsList"
          :key="patientSummary.id"
          class="flex flex-col justify-between border border-default bg-default p-5 shadow-sm hover:border-primary transition-colors cursor-pointer"
          @click="selectPatient(patientSummary.id)"
        >
          <div>
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-bold text-highlighted text-base">{{ patientSummary.full_name }}</h3>
                <p class="text-xs text-muted mt-0.5">{{ patientSummary.phone }}</p>
              </div>
              <UBadge :label="`${patientSummary.prescriptionsCount} وصفات`" color="primary" variant="subtle" />
            </div>

            <div v-if="patientSummary.latestPrescription" class="mt-4 border-t border-default pt-3 text-xs space-y-1">
              <p class="text-muted font-medium">أحدث وصفة:</p>
              <p class="text-highlighted font-semibold">{{ patientSummary.latestPrescription.medicine_name }}</p>
              <p class="text-toned">{{ patientSummary.latestPrescription.dosage }} · {{ patientSummary.latestPrescription.frequency }}</p>
              <p class="text-muted text-[11px]">{{ formatDate(patientSummary.latestPrescription.prescribed_on) }}</p>
            </div>
          </div>

          <div class="mt-4 border-t border-default pt-3 flex justify-end">
            <UButton icon="i-lucide-file-text" color="primary" variant="ghost" size="sm" label="عرض الوصفات" @click.stop="selectPatient(patientSummary.id)" />
          </div>
        </article>
      </div>
    </div>

    <!-- Mode 2: Patient selected -> Show prescriptions grouped by visit -->
    <div v-else-if="groupedPrescriptions.length === 0" class="border border-dashed border-default p-10 text-center text-sm text-muted">
      لا توجد وصفات لهذا المراجع.
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="group in groupedPrescriptions"
        :key="group.recordId"
        class="border border-default bg-default p-5 shadow-sm space-y-4"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-3">
          <div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="size-4 text-primary" />
              <h2 class="font-bold text-highlighted text-base">زيارة: {{ formatDate(group.visitDate) }}</h2>
            </div>
            <p v-if="group.diagnosis" class="mt-0.5 text-xs text-toned">التشخيص: {{ group.diagnosis }}</p>
            <p v-if="group.doctorName" class="text-xs text-muted">الطبيب: د. {{ group.doctorName }}</p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-printer"
              color="primary"
              variant="solid"
              size="sm"
              label="طباعة الوصفة الطبية (Rx)"
              @click="printVisitPrescriptions(group.recordId)"
            />
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <article
            v-for="item in group.items"
            :key="item.id"
            class="border border-default bg-muted/20 p-4 shadow-2xs space-y-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-bold text-highlighted text-base">{{ item.medicine_name }}</h3>
                <p class="mt-0.5 text-sm text-toned">{{ item.dosage }} · {{ item.frequency }}</p>
              </div>
              <UBadge
                :label="statusItems.find((status) => status.value === item.status)?.label"
                :color="item.status === 'active' ? 'primary' : item.status === 'fulfilled' ? 'success' : 'neutral'"
                variant="subtle"
              />
            </div>
            <dl class="space-y-1 text-xs">
              <div class="flex justify-between gap-4">
                <dt class="text-muted">المدة:</dt>
                <dd class="text-highlighted font-medium">{{ item.duration_days ? `${item.duration_days} أيام` : 'غير محددة' }}</dd>
              </div>
              <div v-if="item.notes">
                <dt class="text-muted">تعليمات:</dt>
                <dd class="mt-0.5 whitespace-pre-wrap text-highlighted">{{ item.notes }}</dd>
              </div>
            </dl>
            <div class="flex flex-wrap gap-2 border-t border-default pt-2.5 justify-end">
              <UButton
                v-if="canManage"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="تعديل الوصفة"
                @click="openEdit(item)"
              />
              <UButton
                v-if="canManage"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                aria-label="حذف الوصفة"
                @click="deletePrescription(item)"
              />
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <UModal v-model:open="isModalOpen" :title="editingId ? 'تعديل وصفة طبية' : 'وصفة طبية جديدة (إضافة أدوية)'">
      <template #body>
        <form class="space-y-4" @submit.prevent="savePrescription">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="المراجع" required class="sm:col-span-2">
              <USelect
                v-model="form.patientId"
                :items="modalPatientItems"
                placeholder="اختر مراجعاً"
                :disabled="!!editingId"
              />
            </UFormField>

            <UFormField label="تاريخ الزيارة" required class="sm:col-span-2">
              <USelect
                v-model="form.recordId"
                :items="modalRecordItems"
                placeholder="اختر تاريخ الزيارة المرتبطة بالوصفة"
                :disabled="!form.patientId || modalRecords.length === 0"
              />
              <p v-if="form.patientId && modalRecords.length === 0" class="mt-1 text-xs text-error">
                لا توجد زيارات مسجلة لهذا المراجع. يجب إضافة زيارة في السجل الطبي أولاً لإنشاء وصفة.
              </p>
            </UFormField>
          </div>

          <div class="border-t border-default pt-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-highlighted text-sm flex items-center gap-1.5">
                <UIcon name="i-lucide-pill" class="size-4 text-primary" />
                الأدوية الموصوفة ({{ form.medicines.length }})
              </h3>
              <UButton
                v-if="!editingId"
                icon="i-lucide-plus"
                color="primary"
                variant="ghost"
                size="xs"
                label="إضافة دواء آخر"
                @click="addMedicineRow"
              />
            </div>

            <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
              <div
                v-for="(med, idx) in form.medicines"
                :key="idx"
                class="border border-default bg-muted/20 p-3.5 space-y-3 relative"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-primary">دواء #{{ idx + 1 }}</span>
                  <UButton
                    v-if="!editingId && form.medicines.length > 1"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="حذف الدواء"
                    @click="removeMedicineRow(idx)"
                  />
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <UFormField label="اسم الدواء" required>
                    <UInput v-model="med.medicineName" placeholder="مثال: Amoxicillin 500mg" />
                  </UFormField>

                  <UFormField label="الجرعة" required>
                    <UInput v-model="med.dosage" placeholder="مثال: كبسولة واحدة" />
                  </UFormField>

                  <UFormField label="التكرار" required>
                    <UInput v-model="med.frequency" placeholder="مثال: كل 8 ساعات (3 مرات يومياً)" />
                  </UFormField>

                  <UFormField label="المدة بالأيام">
                    <UInput v-model="med.durationDays" type="number" min="1" placeholder="مثال: 7" />
                  </UFormField>

                  <UFormField label="تعليمات الاستخدام" class="sm:col-span-2">
                    <UInput v-model="med.notes" placeholder="مثال: بعد الطعام مع الكثير من الماء" />
                  </UFormField>
                </div>
              </div>
            </div>
          </div>

          <UFormField label="حالة الوصفة">
            <USelect v-model="form.status" :items="statusItems" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-3 border-t border-default">
            <UButton color="neutral" variant="ghost" label="إلغاء" @click="isModalOpen = false" />
            <UButton
              type="submit"
              icon="i-lucide-save"
              label="حفظ الوصفة"
              :loading="isLoading"
              :disabled="!isFormValid"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Iraqi Prescription Print Template (قالب الوصفة الطبية العراقية) -->
    <Teleport to="body">
      <article v-if="printSheetData" class="print-sheet" dir="rtl">
        <!-- Header Section -->
        <header class="irq-header">
          <div class="header-right">
            <p class="gov-title">جمهورية العراق - وزارة الصحة</p>
            <p class="assoc-title">نقابة أطباء العراق</p>
            <h1 class="doc-name">د. {{ printSheetData.doctorName || currentUser?.username || 'المعالج' }}</h1>
            <p class="doc-sub">أخصائي الطب العام والباطنية</p>
            <p class="doc-qual">زميل المجلس العراقي للتخصصات الطبية (بورد عراقي)</p>
          </div>

          <div class="header-center">
            <div class="rx-emblem-box">
              <span class="rx-symbol">℞</span>
              <span class="rx-label">وصفة طبية</span>
            </div>
          </div>

          <div class="header-left" dir="ltr">
            <p class="gov-title-en">Republic of Iraq - Ministry of Health</p>
            <p class="assoc-title-en">Iraqi Medical Association</p>
            <h1 class="doc-name-en">Dr. {{ printSheetData.doctorName || currentUser?.username || 'Physician' }}</h1>
            <p class="doc-sub-en">Consultant Physician & Specialist</p>
            <p class="doc-qual-en">M.B.Ch.B. - F.I.C.M.S. (Iraqi Board)</p>
          </div>
        </header>

        <!-- Patient Information Bar -->
        <section class="patient-bar">
          <div class="info-cell">
            <span class="info-label">اسم المريض / Name:</span>
            <span class="info-value">{{ printSheetData.patient?.full_name || 'غير محدد' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">العمر / Age:</span>
            <span class="info-value">{{ calculateAge(printSheetData.patient?.date_of_birth) }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">التاريخ / Date:</span>
            <span class="info-value">{{ formatDate(printSheetData.visitDate) }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">الهاتف / Phone:</span>
            <span class="info-value">{{ printSheetData.patient?.phone || '-' }}</span>
          </div>
        </section>

        <!-- Diagnosis row if available -->
        <div v-if="printSheetData.diagnosis" class="diagnosis-strip">
          <span class="diag-label">التشخيص الطبي / Diagnosis:</span>
          <span class="diag-val">{{ printSheetData.diagnosis }}</span>
        </div>

        <!-- Main Rx Content Area -->
        <main class="rx-content-area">
          <div class="rx-watermark">℞</div>
          <div class="medicines-container">
            <div
              v-for="(item, idx) in printSheetData.prescriptions"
              :key="item.id || idx"
              class="rx-medicine-row"
            >
              <div class="med-title-row">
                <span class="med-num">{{ idx + 1 }}.</span>
                <span class="med-name">{{ item.medicine_name }}</span>
              </div>
              <div class="med-details-row">
                <span class="med-detail-badge">الجرعة: {{ item.dosage }}</span>
                <span class="med-detail-badge">التكرار: {{ item.frequency }}</span>
                <span v-if="item.duration_days" class="med-detail-badge">المدة: {{ item.duration_days }} أيام</span>
              </div>
              <p v-if="item.notes" class="med-instruction-note">تعليمات: {{ item.notes }}</p>
            </div>
          </div>
        </main>

        <!-- Footer Section -->
        <footer class="irq-footer">
          <div class="footer-left-stamp">
            <p class="stamp-title">توقيع وختم الطبيب المعالج</p>
            <div class="stamp-line"></div>
          </div>

          <div class="footer-center-notice">
            <p>* يرجى الالتزام التام بالجرعات والمواعيد المحددة أعلاه.</p>
            <p>* المراجعة مجانية خلال (7) أيام من تاريخ إيقاع الكشف.</p>
          </div>

          <div class="footer-bottom-address">
            <p>بغداد - الحارثية - شارع الأطباء | هاتف العيادة: 0770 000 0000 - 0780 000 0000</p>
          </div>
        </footer>
      </article>
    </Teleport>
  </section>
</template>

<style>
.print-sheet {
  display: none;
}
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  
  /* Hide main application root completely when printing */
  #app {
    display: none !important;
  }

  .print-sheet {
    display: flex !important;
    flex-direction: column;
    justify-content: space-between;
    position: relative !important;
    width: 100% !important;
    min-height: 100vh !important;
    padding: 5mm 8mm !important;
    color: #0f172a !important;
    background-color: #ffffff !important;
    font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif !important;
    box-sizing: border-box !important;
  }

  .print-sheet * {
    visibility: visible !important;
  }

  /* Header Styles */
  .irq-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px double #0f766e;
    padding-bottom: 8mm;
    margin-bottom: 5mm;
  }
  .header-right {
    text-align: right;
  }
  .header-left {
    text-align: left;
  }
  .gov-title, .gov-title-en {
    font-size: 9pt;
    font-weight: 600;
    color: #475569;
    margin: 0;
  }
  .assoc-title, .assoc-title-en {
    font-size: 8pt;
    color: #0f766e;
    font-weight: 700;
    margin-bottom: 2mm;
  }
  .doc-name, .doc-name-en {
    font-size: 16pt;
    font-weight: 800;
    color: #0f766e;
    margin: 0 0 1mm 0;
  }
  .doc-sub, .doc-sub-en {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }
  .doc-qual, .doc-qual-en {
    font-size: 8pt;
    color: #64748b;
    margin: 0;
  }
  .header-center {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .rx-emblem-box {
    border: 2px solid #0f766e;
    border-radius: 50%;
    width: 20mm;
    height: 20mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #f0fdf4;
  }
  .rx-symbol {
    font-size: 22pt;
    font-weight: 900;
    color: #0f766e;
    line-height: 1;
    font-family: serif;
  }
  .rx-label {
    font-size: 6.5pt;
    font-weight: 700;
    color: #0f766e;
  }

  /* Patient Info Bar */
  .patient-bar {
    display: grid;
    grid-template-columns: 2fr 1fr 1.5fr 1.5fr;
    border: 1px solid #cbd5e1;
    background-color: #f8fafc;
    padding: 3mm 4mm;
    gap: 2mm;
    margin-bottom: 4mm;
    border-radius: 2mm;
  }
  .info-cell {
    display: flex;
    gap: 1mm;
    align-items: center;
    font-size: 9.5pt;
  }
  .info-label {
    color: #475569;
    font-weight: 600;
  }
  .info-value {
    color: #0f172a;
    font-weight: 700;
  }

  .diagnosis-strip {
    font-size: 9.5pt;
    padding: 2mm 3mm;
    border-right: 3px solid #0f766e;
    background-color: #f1f5f9;
    margin-bottom: 5mm;
  }
  .diag-label {
    font-weight: 700;
    color: #334155;
  }
  .diag-val {
    color: #0f172a;
  }

  /* Rx Content Area */
  .rx-content-area {
    position: relative;
    flex-grow: 1;
    padding: 4mm 2mm;
    min-height: 120mm;
  }
  .rx-watermark {
    position: absolute;
    top: 30%;
    left: 45%;
    transform: translate(-50%, -50%);
    font-size: 150pt;
    font-weight: 900;
    color: rgba(15, 118, 110, 0.04);
    font-family: serif;
    pointer-events: none;
    user-select: none;
  }
  .medicines-container {
    display: flex;
    flex-direction: column;
    gap: 4mm;
    position: relative;
    z-index: 1;
  }
  .rx-medicine-row {
    border-bottom: 1px dashed #cbd5e1;
    padding-bottom: 3mm;
    page-break-inside: avoid;
  }
  .med-title-row {
    display: flex;
    align-items: center;
    gap: 2mm;
  }
  .med-num {
    font-size: 12pt;
    font-weight: 800;
    color: #0f766e;
  }
  .med-name {
    font-size: 13pt;
    font-weight: 800;
    color: #0f172a;
    font-family: system-ui, sans-serif;
  }
  .med-details-row {
    display: flex;
    flex-wrap: wrap;
    gap: 3mm;
    margin-top: 1.5mm;
    margin-right: 6mm;
  }
  .med-detail-badge {
    font-size: 9.5pt;
    font-weight: 700;
    background-color: #f1f5f9;
    padding: 1mm 3mm;
    border-radius: 1mm;
    color: #1e293b;
  }
  .med-instruction-note {
    font-size: 9pt;
    color: #475569;
    margin: 1.5mm 6mm 0 0;
    white-space: pre-wrap;
  }

  /* Footer */
  .irq-footer {
    margin-top: auto;
    border-top: 2px solid #0f766e;
    padding-top: 4mm;
    display: flex;
    flex-direction: column;
    gap: 4mm;
  }
  .footer-left-stamp {
    align-self: flex-start;
    text-align: center;
    width: 50mm;
  }
  .stamp-title {
    font-size: 9pt;
    font-weight: 700;
    color: #334155;
    margin-bottom: 12mm;
  }
  .stamp-line {
    border-bottom: 1.5px dotted #94a3b8;
  }
  .footer-center-notice {
    font-size: 8pt;
    color: #64748b;
    line-height: 1.5;
  }
  .footer-bottom-address {
    text-align: center;
    font-size: 8.5pt;
    font-weight: 700;
    color: #0f766e;
    border-top: 1px solid #e2e8f0;
    padding-top: 2mm;
  }
}
</style>