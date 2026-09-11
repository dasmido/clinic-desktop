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
  type CreateAttachmentInput,
  type CreateMedicalRecordInput,
  type UpdateMedicalRecordInput,
  updateMedicalRecord,
} from './repositories/medical-records.repository.js';

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
  createWindow();
  // Boot Postgres in parallel; IPC handlers await the shared startup promise as needed.
  void startDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let isQuitting = false;

app.on('before-quit', (event) => {
  if (isQuitting) return;

  // Defer quitting until the embedded Postgres instance has shut down cleanly.
  event.preventDefault();
  isQuitting = true;
  void stopDatabase().finally(() => app.quit());
});