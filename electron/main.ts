import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase, startDatabase, stopDatabase } from './database.js';
import {
  countUsers,
  createUser,
  deleteUser,
  listUsers,
  verifyUserCredentials,
  type AuthUser,
} from './repositories/users.repository.js';
import {
  createPatient,
  deletePatient,
  listPatients,
  updatePatient,
} from './repositories/patients.repository.js';
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from './repositories/appointments.repository.js';
import {
  addDoctorAvailability,
  createDoctorProfile,
  deleteDoctor,
  isDoctorAvailableForSlot,
  listDoctorAvailability,
  listDoctors,
  removeDoctorAvailability,
} from './repositories/doctors.repository.js';
import {
  adjustInventoryQuantity,
  createInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
  updateInventoryItem,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
} from './repositories/inventory.repository.js';
import {
  createTransaction,
  deleteTransaction,
  getFinanceSummary,
  listTransactions,
  type CreateTransactionInput,
} from './repositories/finance.repository.js';
import {
  createAttachment,
  createMedicalRecord,
  deleteAttachment,
  deleteMedicalRecord,
  findMedicalRecordById,
  listAttachmentsForRecords,
  listMedicalRecordsByPatient,
  listMedicalRecordsForRange,
  type CreateAttachmentInput,
  type CreateMedicalRecordInput,
  type UpdateMedicalRecordInput,
  updateMedicalRecord,
} from './repositories/medical-records.repository.js';
import {
  createPrescription,
  deletePrescription,
  listAllPrescriptions,
  listPrescriptionsByMedicalRecord,
  listPrescriptionsByPatient,
  updatePrescription,
  updatePrescriptionStatus,
  type CreatePrescriptionInput,
  type UpdatePrescriptionInput,
} from './repositories/prescriptions.repository.js';
import type { PrescriptionStatus } from '../src/database/types.js';
import {
  createLabOrder,
  createLabResult,
  deleteLabOrder,
  listLabOrdersByPatient,
  listLabResultsByOrder,
  listOpenLabOrders,
  updateLabOrderStatus,
  type CreateLabOrderInput,
  type CreateLabResultInput,
} from './repositories/lab-orders.repository.js';
import {
  createVisitTemplate,
  deactivateVisitTemplate,
  listVisitTemplates,
  updateVisitTemplate,
  type CreateVisitTemplateInput,
  type UpdateVisitTemplateInput,
} from './repositories/visit-templates.repository.js';
import {
  createClinicalAlert,
  deactivateClinicalAlert,
  dismissClinicalAlert,
  listActiveClinicalAlerts,
  type CreateClinicalAlertInput,
} from './repositories/clinical-alerts.repository.js';
import type { LabOrderStatus } from '../src/database/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let win: BrowserWindow | null;

// Session lives only in memory for the running instance; login is required every launch.
let currentSessionUser: AuthUser | null = null;

const userRoles = new Set<AuthUser['role']>([
  'doctor',
  'nurse',
  'lab',
  'pharmacy',
  'moderator',
  'admin',
]);

function assertSignedIn() {
  if (!currentSessionUser) {
    throw new Error('Please sign in before accessing clinic data.');
  }
}

function assertUserHasRole(allowedRoles: readonly AuthUser['role'][]): AuthUser {
  const user = currentSessionUser;

  if (!user) {
    throw new Error('Please sign in before accessing clinic data.');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error('You do not have permission to perform this action.');
  }

  return user;
}

function registerDatabaseHandlers() {
  ipcMain.handle('database:is-ready', async () => {
    await startDatabase();
    return true;
  });
}

function registerPatientHandlers() {
  ipcMain.handle('patients:list', async (_event, search?: string) => {
    assertSignedIn();
    return listPatients(await getDatabase(), search);
  });

  ipcMain.handle('patients:create', async (_event, input: Parameters<typeof createPatient>[1]) => {
    assertSignedIn();
    return createPatient(await getDatabase(), input);
  });

  ipcMain.handle('patients:update', async (_event, patientId: number, input: Parameters<typeof updatePatient>[2]) => {
    assertSignedIn();
    return updatePatient(await getDatabase(), patientId, input);
  });

  ipcMain.handle('patients:delete', async (_event, patientId: number) => {
    assertSignedIn();
    await deletePatient(await getDatabase(), patientId);
    return true;
  });
}

function registerAppointmentHandlers() {
  ipcMain.handle('appointments:list-for-range', async (_event, from: string, to: string) => {
    assertSignedIn();
    return listAppointments(await getDatabase(), { from: new Date(from), to: new Date(to) });
  });

  ipcMain.handle('appointments:create', async (_event, input: CreateAppointmentInput) => {
    assertSignedIn();
    const db = await getDatabase();
    const startsAt = new Date(input.starts_at);
    const endsAt = new Date(input.ends_at);

    if (input.doctor_id !== null && !(await isDoctorAvailableForSlot(db, input.doctor_id, startsAt, endsAt))) {
      throw new Error('الطبيب غير متاح خلال الوقت المحدد.');
    }

    return createAppointment(db, input);
  });

  ipcMain.handle('appointments:update', async (_event, appointmentId: number, input: UpdateAppointmentInput) => {
    assertSignedIn();
    const db = await getDatabase();

    if (input.doctor_id != null && input.starts_at !== undefined && input.ends_at !== undefined) {
      const startsAt = new Date(input.starts_at);
      const endsAt = new Date(input.ends_at);

      if (!(await isDoctorAvailableForSlot(db, input.doctor_id, startsAt, endsAt))) {
        throw new Error('الطبيب غير متاح خلال الوقت المحدد.');
      }
    }

    return updateAppointment(db, appointmentId, input);
  });

  ipcMain.handle('appointments:delete', async (_event, appointmentId: number) => {
    assertSignedIn();
    await deleteAppointment(await getDatabase(), appointmentId);
    return true;
  });
}

function registerDoctorHandlers() {
  ipcMain.handle('doctors:list', async () => {
    assertSignedIn();
    return listDoctors(await getDatabase());
  });

  ipcMain.handle('doctors:create-profile', async (_event, userId: number, displayName: string) => {
    assertSignedIn();
    await createDoctorProfile(await getDatabase(), userId, displayName);
    return true;
  });

  ipcMain.handle('doctors:delete', async (_event, doctorId: number) => {
    assertSignedIn();
    await deleteDoctor(await getDatabase(), doctorId);
    return true;
  });

  ipcMain.handle('doctors:list-availability', async (_event, doctorId: number) => {
    assertSignedIn();
    return listDoctorAvailability(await getDatabase(), doctorId);
  });

  ipcMain.handle('doctors:add-availability', async (_event, doctorId: number, dayOfWeek: number, startsAt: string, endsAt: string) => {
    assertSignedIn();
    await addDoctorAvailability(await getDatabase(), doctorId, dayOfWeek, startsAt, endsAt);
    return true;
  });

  ipcMain.handle('doctors:remove-availability', async (_event, availabilityId: number) => {
    assertSignedIn();
    await removeDoctorAvailability(await getDatabase(), availabilityId);
    return true;
  });
}

function registerInventoryHandlers() {
  ipcMain.handle('inventory:list', async () => {
    assertSignedIn();
    return listInventoryItems(await getDatabase());
  });

  ipcMain.handle('inventory:create-item', async (_event, input: CreateInventoryItemInput) => {
    assertSignedIn();
    return createInventoryItem(await getDatabase(), input);
  });

  ipcMain.handle('inventory:update-item', async (_event, itemId: number, input: UpdateInventoryItemInput) => {
    assertSignedIn();
    return updateInventoryItem(await getDatabase(), itemId, input);
  });

  ipcMain.handle('inventory:delete-item', async (_event, itemId: number) => {
    assertSignedIn();
    await deleteInventoryItem(await getDatabase(), itemId);
    return true;
  });

  ipcMain.handle('inventory:adjust-quantity', async (_event, itemId: number, quantityChange: number, reason: string, notes?: string) => {
    assertSignedIn();
    return adjustInventoryQuantity(await getDatabase(), itemId, quantityChange, reason, notes);
  });
}

function registerFinanceHandlers() {
  ipcMain.handle('finance:get-summary', async (_event, monthStart: string) => {
    assertSignedIn();
    return getFinanceSummary(await getDatabase(), monthStart);
  });

  ipcMain.handle('finance:list-transactions', async (_event, limit?: number) => {
    assertSignedIn();
    return listTransactions(await getDatabase(), limit);
  });

  ipcMain.handle('finance:create-transaction', async (_event, input: CreateTransactionInput) => {
    assertSignedIn();
    return createTransaction(await getDatabase(), input);
  });

  ipcMain.handle('finance:delete-transaction', async (_event, transactionId: number) => {
    assertSignedIn();
    await deleteTransaction(await getDatabase(), transactionId);
    return true;
  });
}

function registerMedicalRecordHandlers() {
  ipcMain.handle('medical-records:list-by-patient', async (_event, patientId: number) => {
    assertSignedIn();
    const db = await getDatabase();
    const records = await listMedicalRecordsByPatient(db, patientId);
    const attachments = await listAttachmentsForRecords(db, records.map((record) => record.id));
    return { records, attachments };
  });

  ipcMain.handle('medical-records:list-for-range', async (_event, from: string, to: string) => {
    assertSignedIn();
    return listMedicalRecordsForRange(await getDatabase(), from, to);
  });

  ipcMain.handle('medical-records:create', async (_event, input: CreateMedicalRecordInput) => {
    assertSignedIn();
    return createMedicalRecord(await getDatabase(), input);
  });

  ipcMain.handle('medical-records:update', async (_event, recordId: number, input: UpdateMedicalRecordInput) => {
    assertSignedIn();
    return updateMedicalRecord(await getDatabase(), recordId, input);
  });

  ipcMain.handle('medical-records:delete', async (_event, recordId: number) => {
    assertSignedIn();
    await deleteMedicalRecord(await getDatabase(), recordId);
    return true;
  });

  ipcMain.handle('medical-records:add-attachment', async (_event, input: CreateAttachmentInput) => {
    assertSignedIn();
    return createAttachment(await getDatabase(), input);
  });

  ipcMain.handle('medical-records:delete-attachment', async (_event, attachmentId: number) => {
    assertSignedIn();
    await deleteAttachment(await getDatabase(), attachmentId);
    return true;
  });
}

function assertPrescriptionStatus(status: unknown): asserts status is PrescriptionStatus {
  if (status !== 'active' && status !== 'fulfilled' && status !== 'cancelled') {
    throw new Error('A valid prescription status is required.');
  }
}

function registerPrescriptionHandlers() {
  ipcMain.handle('prescriptions:list-all', async () => {
    assertUserHasRole(['doctor', 'nurse', 'pharmacy', 'admin']);
    return listAllPrescriptions(await getDatabase());
  });

  ipcMain.handle('prescriptions:list-by-patient', async (_event, patientId: number) => {
    assertUserHasRole(['doctor', 'nurse', 'pharmacy', 'admin']);
    return listPrescriptionsByPatient(await getDatabase(), patientId);
  });

  ipcMain.handle('prescriptions:list-by-medical-record', async (_event, medicalRecordId: number) => {
    assertUserHasRole(['doctor', 'nurse', 'pharmacy', 'admin']);
    return listPrescriptionsByMedicalRecord(await getDatabase(), medicalRecordId);
  });

  ipcMain.handle('prescriptions:create', async (_event, input: Omit<CreatePrescriptionInput, 'prescribed_by_user_id'>) => {
    const user = assertUserHasRole(['doctor', 'admin']);
    return createPrescription(await getDatabase(), { ...input, prescribed_by_user_id: user.id });
  });

  ipcMain.handle('prescriptions:update-status', async (_event, prescriptionId: number, status: PrescriptionStatus) => {
    assertUserHasRole(['doctor', 'admin']);
    assertPrescriptionStatus(status);
    return updatePrescriptionStatus(await getDatabase(), prescriptionId, status);
  });

  ipcMain.handle('prescriptions:update', async (_event, prescriptionId: number, input: UpdatePrescriptionInput) => {
    assertUserHasRole(['doctor', 'admin']);
    return updatePrescription(await getDatabase(), prescriptionId, input);
  });

  ipcMain.handle('prescriptions:delete', async (_event, prescriptionId: number) => {
    assertUserHasRole(['doctor', 'admin']);
    await deletePrescription(await getDatabase(), prescriptionId);
    return true;
  });
}

function assertLabOrderStatus(status: unknown): asserts status is LabOrderStatus {
  if (status !== 'pending' && status !== 'resulted' && status !== 'cancelled') {
    throw new Error('A valid lab order status is required.');
  }
}

function registerLabHandlers() {
  ipcMain.handle('labs:list-by-patient', async (_event, patientId: number) => {
    assertUserHasRole(['doctor', 'nurse', 'lab', 'admin']);
    return listLabOrdersByPatient(await getDatabase(), patientId);
  });

  ipcMain.handle('labs:list-open-orders', async () => {
    assertUserHasRole(['doctor', 'nurse', 'lab', 'admin']);
    return listOpenLabOrders(await getDatabase());
  });

  ipcMain.handle('labs:list-results-by-order', async (_event, orderId: number) => {
    assertUserHasRole(['doctor', 'nurse', 'lab', 'admin']);
    return listLabResultsByOrder(await getDatabase(), orderId);
  });

  ipcMain.handle('labs:create-order', async (_event, input: Omit<CreateLabOrderInput, 'ordered_by_user_id'>) => {
    const user = assertUserHasRole(['doctor', 'nurse', 'admin']);
    return createLabOrder(await getDatabase(), { ...input, ordered_by_user_id: user.id });
  });

  ipcMain.handle('labs:create-result', async (_event, orderId: number, input: Omit<CreateLabResultInput, 'recorded_by_user_id'>) => {
    const user = assertUserHasRole(['lab', 'admin']);
    return createLabResult(await getDatabase(), orderId, { ...input, recorded_by_user_id: user.id });
  });

  ipcMain.handle('labs:update-status', async (_event, orderId: number, status: LabOrderStatus) => {
    assertUserHasRole(['doctor', 'nurse', 'admin']);
    assertLabOrderStatus(status);
    return updateLabOrderStatus(await getDatabase(), orderId, status);
  });

  ipcMain.handle('labs:delete-order', async (_event, orderId: number) => {
    assertUserHasRole(['doctor', 'admin']);
    await deleteLabOrder(await getDatabase(), orderId);
    return true;
  });
}

function registerVisitTemplateHandlers() {
  ipcMain.handle('visit-templates:list', async (_event, includeInactive?: boolean) => {
    assertUserHasRole(['doctor', 'nurse', 'admin']);
    return listVisitTemplates(await getDatabase(), currentSessionUser?.role === 'admin' && includeInactive === true);
  });

  ipcMain.handle('visit-templates:create', async (_event, input: Omit<CreateVisitTemplateInput, 'created_by_user_id'>) => {
    const user = assertUserHasRole(['admin']);
    return createVisitTemplate(await getDatabase(), { ...input, created_by_user_id: user.id });
  });

  ipcMain.handle('visit-templates:update', async (_event, templateId: number, input: UpdateVisitTemplateInput) => {
    assertUserHasRole(['admin']);
    return updateVisitTemplate(await getDatabase(), templateId, input);
  });

  ipcMain.handle('visit-templates:deactivate', async (_event, templateId: number) => {
    assertUserHasRole(['admin']);
    return deactivateVisitTemplate(await getDatabase(), templateId);
  });
}

function registerClinicalAlertHandlers() {
  ipcMain.handle('clinical-alerts:list-active', async (_event, patientId: number) => {
    assertUserHasRole(['doctor', 'nurse', 'lab', 'pharmacy', 'admin']);
    return listActiveClinicalAlerts(await getDatabase(), patientId);
  });

  ipcMain.handle('clinical-alerts:create', async (_event, input: Omit<CreateClinicalAlertInput, 'created_by_user_id'>) => {
    const user = assertUserHasRole(['doctor', 'nurse', 'admin']);
    return createClinicalAlert(await getDatabase(), { ...input, created_by_user_id: user.id });
  });

  ipcMain.handle('clinical-alerts:dismiss', async (_event, alertId: number) => {
    assertUserHasRole(['doctor', 'nurse', 'admin']);
    return dismissClinicalAlert(await getDatabase(), alertId);
  });

  ipcMain.handle('clinical-alerts:deactivate', async (_event, alertId: number) => {
    assertUserHasRole(['doctor', 'admin']);
    return deactivateClinicalAlert(await getDatabase(), alertId);
  });
}

function getPatientFilesDirectory(medicalRecordId: number) {
  return path.join(app.getPath('userData'), 'patient-files', String(medicalRecordId));
}

function registerPatientFileHandlers() {
  ipcMain.handle('patient-files:add', async (_event, medicalRecordId: number) => {
    if (!currentSessionUser) throw new Error('Please sign in before adding an attachment.');
    if (!Number.isInteger(medicalRecordId) || medicalRecordId < 1) throw new Error('Invalid medical record.');
    if (!win) throw new Error('Application window is not available.');

    const selected = await dialog.showOpenDialog(win, {
      title: 'اختيار نتائج التحاليل أو الفحوصات',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'المستندات والصور', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx'] }],
    });
    if (selected.canceled) return [];

    const record = await findMedicalRecordById(await getDatabase(), medicalRecordId);
    if (!record) throw new Error('Medical record was not found.');

    const directory = getPatientFilesDirectory(medicalRecordId);
    await fs.mkdir(directory, { recursive: true });

    const attachments = [];
    for (const sourcePath of selected.filePaths) {
      const stat = await fs.stat(sourcePath);
      if (!stat.isFile()) continue;
      if (stat.size > 20 * 1024 * 1024) throw new Error('Each attachment must be 20 MB or smaller.');

      const originalName = path.basename(sourcePath);
      const storedName = `${crypto.randomUUID()}${path.extname(originalName).toLowerCase()}`;
      await fs.copyFile(sourcePath, path.join(directory, storedName));
      attachments.push({ originalName, storedName, fileSizeBytes: stat.size });
    }
    return attachments;
  });

  ipcMain.handle('patient-files:open', async (_event, medicalRecordId: number, storedName: string) => {
    if (!currentSessionUser) throw new Error('Please sign in before opening an attachment.');
    if (!Number.isInteger(medicalRecordId) || !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(storedName)) throw new Error('Invalid attachment.');
    const filePath = path.join(getPatientFilesDirectory(medicalRecordId), storedName);
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
  });

  ipcMain.handle('patient-files:delete', async (_event, medicalRecordId: number, storedName: string) => {
    if (!currentSessionUser) throw new Error('Please sign in before deleting an attachment.');
    if (!Number.isInteger(medicalRecordId) || !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(storedName)) throw new Error('Invalid attachment.');
    await fs.unlink(path.join(getPatientFilesDirectory(medicalRecordId), storedName)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  });

  ipcMain.handle('patient-files:delete-record', async (_event, medicalRecordId: number) => {
    if (!currentSessionUser) throw new Error('Please sign in before deleting a medical record.');
    if (!Number.isInteger(medicalRecordId) || medicalRecordId < 1) throw new Error('Invalid medical record.');
    await fs.rm(getPatientFilesDirectory(medicalRecordId), { recursive: true, force: true });
  });
}

function assertValidCredentials(username: unknown, password: unknown) {
  if (typeof username !== 'string' || !username.trim()) {
    throw new Error('Username is required.');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

function assertValidUserRole(role: unknown): asserts role is AuthUser['role'] {
  if (typeof role !== 'string' || !userRoles.has(role as AuthUser['role'])) {
    throw new Error('A valid user role is required.');
  }
}

function registerAuthHandlers() {
  ipcMain.handle('auth:has-users', async () => {
    return (await countUsers(await getDatabase())) > 0;
  });

  ipcMain.handle('auth:register', async (_event, username: string, password: string) => {
    assertValidCredentials(username, password);

    const db = await getDatabase();
    const hasUsers = (await countUsers(db)) > 0;

    if (hasUsers && currentSessionUser?.role !== 'admin') {
      throw new Error('Registration is closed. Ask an administrator to create your account.');
    }

    const role = hasUsers ? 'nurse' : 'admin';
    const user = await createUser(db, username, password, role);

    if (!hasUsers) {
      currentSessionUser = user;
    }

    return user;
  });

  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    assertValidCredentials(username, password);

    const user = await verifyUserCredentials(await getDatabase(), username, password);

    if (!user) {
      throw new Error('Invalid username or password.');
    }

    currentSessionUser = user;
    return currentSessionUser;
  });

  ipcMain.handle('auth:logout', async () => {
    currentSessionUser = null;
    return true;
  });

  ipcMain.handle('auth:get-current-user', async () => currentSessionUser);

  ipcMain.handle('auth:create-user', async (_event, username: string, password: string, role: string) => {
    if (currentSessionUser?.role !== 'admin') {
      throw new Error('Only an administrator can create new users.');
    }
    assertValidCredentials(username, password);
    assertValidUserRole(role);
    return createUser(await getDatabase(), username, password, role);
  });

  ipcMain.handle('auth:list-users', async () => {
    if (currentSessionUser?.role !== 'admin') {
      throw new Error('Only an administrator can view user accounts.');
    }
    return listUsers(await getDatabase());
  });

  ipcMain.handle('auth:delete-user', async (_event, userId: number) => {
    if (currentSessionUser?.role !== 'admin') throw new Error('Only an administrator can delete user accounts.');
    if (!Number.isInteger(userId) || userId < 1) throw new Error('Invalid user account.');
    if (userId === currentSessionUser.id) throw new Error('You cannot delete the account currently signed in.');

    const db = await getDatabase();
    const target = await db.selectFrom('users').select(['role']).where('id', '=', userId).executeTakeFirst();
    if (!target) throw new Error('User account was not found.');
    if (target.role === 'admin' && (await countUsers(db)) === 1) throw new Error('The last administrator account cannot be deleted.');
    await deleteUser(db, userId);
    return true;
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[renderer] did-fail-load', errorCode, errorDescription);
  });
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log('[renderer console]', level, message, `${sourceId}:${line}`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  registerDatabaseHandlers();
  registerPatientFileHandlers();
  registerAuthHandlers();
  registerPatientHandlers();
  registerAppointmentHandlers();
  registerDoctorHandlers();
  registerInventoryHandlers();
  registerFinanceHandlers();
  registerMedicalRecordHandlers();
  registerPrescriptionHandlers();
  registerLabHandlers();
  registerVisitTemplateHandlers();
  registerClinicalAlertHandlers();
  createWindow();
  // Boot Postgres in parallel; IPC handlers await the shared startup promise as needed.
  void startDatabase();
});

app.on('window-all-closed', () => {
  app.quit();
});

let isQuitting = false;

app.on('before-quit', (event) => {
  if (isQuitting) return;

  // Defer quitting until the embedded Postgres instance has shut down cleanly.
  event.preventDefault();
  isQuitting = true;
  void stopDatabase().finally(() => app.quit());
});