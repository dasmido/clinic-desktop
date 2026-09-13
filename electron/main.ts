import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDatabase, stopDatabase } from './database.js';
import {
  AppointmentsService,
  AuthService,
  ClinicalAlertsService,
  DoctorsService,
  FinanceService,
  InventoryService,
  LabsService,
  MedicalRecordsService,
  PatientFilesService,
  PatientsService,
  PrescriptionsService,
  SettingsService,
  VisitTemplatesService,
} from './services/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Last line of defense: log stray errors (e.g. a dropped DB connection during shutdown)
// instead of letting Electron crash the whole process and leave a dead/white window.
process.on('uncaughtException', (error) => console.error('[main] uncaughtException', error));
process.on('unhandledRejection', (reason) => console.error('[main] unhandledRejection', reason));

let win: BrowserWindow | null = null;

function registerDatabaseHandlers() {
  ipcMain.handle('database:is-ready', async () => {
    await startDatabase();
    return true;
  });
}

function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async () => SettingsService.fetchAppSettings());
  ipcMain.handle('settings:update', async (_event, input) => SettingsService.saveAppSettings(input));
}

function registerPatientHandlers() {
  ipcMain.handle('patients:list', async (_event, search?: string) => PatientsService.listPatients(search));
  ipcMain.handle('patients:create', async (_event, input) => PatientsService.createPatient(input));
  ipcMain.handle('patients:update', async (_event, patientId: number, input) => PatientsService.updatePatient(patientId, input));
  ipcMain.handle('patients:delete', async (_event, patientId: number) => PatientsService.deletePatient(patientId));
}

function registerAppointmentHandlers() {
  ipcMain.handle('appointments:list-for-range', async (_event, from: string, to: string) => AppointmentsService.listAppointmentsForRange(from, to));
  ipcMain.handle('appointments:create', async (_event, input) => AppointmentsService.createAppointment(input));
  ipcMain.handle('appointments:update', async (_event, appointmentId: number, input) => AppointmentsService.updateAppointment(appointmentId, input));
  ipcMain.handle('appointments:delete', async (_event, appointmentId: number) => AppointmentsService.deleteAppointment(appointmentId));
}

function registerDoctorHandlers() {
  ipcMain.handle('doctors:list', async () => DoctorsService.listDoctors());
  ipcMain.handle('doctors:create-profile', async (_event, userId: number, displayName: string, consultationFee?: number) =>
    DoctorsService.createDoctorProfile(userId, displayName, consultationFee),
  );
  ipcMain.handle('doctors:update-consultation-fee', async (_event, doctorId: number, consultationFee: number) =>
    DoctorsService.updateDoctorConsultationFee(doctorId, consultationFee),
  );
  ipcMain.handle('doctors:delete', async (_event, doctorId: number) => DoctorsService.deleteDoctor(doctorId));
  ipcMain.handle('doctors:list-availability', async (_event, doctorId: number) => DoctorsService.listDoctorAvailability(doctorId));
  ipcMain.handle('doctors:add-availability', async (_event, doctorId: number, dayOfWeek: number, startsAt: string, endsAt: string) =>
    DoctorsService.addDoctorAvailability(doctorId, dayOfWeek, startsAt, endsAt),
  );
  ipcMain.handle('doctors:remove-availability', async (_event, availabilityId: number) =>
    DoctorsService.removeDoctorAvailability(availabilityId),
  );
}

function registerInventoryHandlers() {
  ipcMain.handle('inventory:list', async () => InventoryService.listInventoryItems());
  ipcMain.handle('inventory:create-item', async (_event, input) => InventoryService.createInventoryItem(input));
  ipcMain.handle('inventory:update-item', async (_event, itemId: number, input) => InventoryService.updateInventoryItem(itemId, input));
  ipcMain.handle('inventory:delete-item', async (_event, itemId: number) => InventoryService.deleteInventoryItem(itemId));
  ipcMain.handle('inventory:adjust-quantity', async (_event, itemId: number, quantityChange: number, reason: string, notes?: string) =>
    InventoryService.adjustInventoryQuantity(itemId, quantityChange, reason, notes),
  );
}

function registerFinanceHandlers() {
  ipcMain.handle('finance:get-summary', async (_event, monthStart: string) => FinanceService.getFinanceSummary(monthStart));
  ipcMain.handle('finance:list-transactions', async (_event, limit?: number) => FinanceService.listTransactions(limit));
  ipcMain.handle('finance:create-transaction', async (_event, input) => FinanceService.createTransaction(input));
  ipcMain.handle('finance:delete-transaction', async (_event, transactionId: number) => FinanceService.deleteTransaction(transactionId));
}

function registerMedicalRecordHandlers() {
  ipcMain.handle('medical-records:list-by-patient', async (_event, patientId: number) => MedicalRecordsService.getMedicalRecordsByPatient(patientId));
  ipcMain.handle('medical-records:list-for-range', async (_event, from: string, to: string) => MedicalRecordsService.getMedicalRecordsForRange(from, to));
  ipcMain.handle('medical-records:create', async (_event, input) => MedicalRecordsService.createMedicalRecord(input));
  ipcMain.handle('medical-records:update', async (_event, recordId: number, input) => MedicalRecordsService.updateMedicalRecord(recordId, input));
  ipcMain.handle('medical-records:update-status', async (_event, recordId: number, status) => MedicalRecordsService.updateMedicalRecordStatus(recordId, status));
  ipcMain.handle('medical-records:delete', async (_event, recordId: number) => MedicalRecordsService.deleteMedicalRecord(recordId));
  ipcMain.handle('medical-records:add-attachment', async (_event, input) => MedicalRecordsService.createAttachment(input));
  ipcMain.handle('medical-records:delete-attachment', async (_event, attachmentId: number) => MedicalRecordsService.deleteAttachment(attachmentId));
}

function registerPrescriptionHandlers() {
  ipcMain.handle('prescriptions:list-all', async () => PrescriptionsService.listAllPrescriptions());
  ipcMain.handle('prescriptions:list-by-patient', async (_event, patientId: number) => PrescriptionsService.listPrescriptionsByPatient(patientId));
  ipcMain.handle('prescriptions:list-by-medical-record', async (_event, medicalRecordId: number) => PrescriptionsService.listPrescriptionsByMedicalRecord(medicalRecordId));
  ipcMain.handle('prescriptions:create', async (_event, input) => PrescriptionsService.createPrescription(input));
  ipcMain.handle('prescriptions:update-status', async (_event, prescriptionId: number, status) => PrescriptionsService.updatePrescriptionStatus(prescriptionId, status));
  ipcMain.handle('prescriptions:update', async (_event, prescriptionId: number, input) => PrescriptionsService.updatePrescription(prescriptionId, input));
  ipcMain.handle('prescriptions:delete', async (_event, prescriptionId: number) => PrescriptionsService.deletePrescription(prescriptionId));
}

function registerLabHandlers() {
  ipcMain.handle('labs:list-by-patient', async (_event, patientId: number) => LabsService.listLabOrdersByPatient(patientId));
  ipcMain.handle('labs:list-open-orders', async () => LabsService.listOpenLabOrders());
  ipcMain.handle('labs:list-closed-orders', async (_event, limit?: number) => LabsService.listClosedLabOrders(limit));
  ipcMain.handle('labs:list-results-by-order', async (_event, orderId: number) => LabsService.listLabResultsByOrder(orderId));
  ipcMain.handle('labs:create-order', async (_event, input) => LabsService.createLabOrder(input));
  ipcMain.handle('labs:create-result', async (_event, orderId: number, input) => LabsService.createLabResult(orderId, input));
  ipcMain.handle('labs:update-status', async (_event, orderId: number, status) => LabsService.updateLabOrderStatus(orderId, status));
  ipcMain.handle('labs:delete-order', async (_event, orderId: number) => LabsService.deleteLabOrder(orderId));
}

function registerVisitTemplateHandlers() {
  ipcMain.handle('visit-templates:list', async (_event, includeInactive?: boolean) => VisitTemplatesService.listVisitTemplates(includeInactive));
  ipcMain.handle('visit-templates:create', async (_event, input) => VisitTemplatesService.createVisitTemplate(input));
  ipcMain.handle('visit-templates:update', async (_event, templateId: number, input) => VisitTemplatesService.updateVisitTemplate(templateId, input));
  ipcMain.handle('visit-templates:deactivate', async (_event, templateId: number) => VisitTemplatesService.deactivateVisitTemplate(templateId));
}

function registerClinicalAlertHandlers() {
  ipcMain.handle('clinical-alerts:list-active', async (_event, patientId: number) => ClinicalAlertsService.listActiveClinicalAlerts(patientId));
  ipcMain.handle('clinical-alerts:create', async (_event, input) => ClinicalAlertsService.createClinicalAlert(input));
  ipcMain.handle('clinical-alerts:dismiss', async (_event, alertId: number) => ClinicalAlertsService.dismissClinicalAlert(alertId));
  ipcMain.handle('clinical-alerts:deactivate', async (_event, alertId: number) => ClinicalAlertsService.deactivateClinicalAlert(alertId));
}

function registerPatientFileHandlers() {
  ipcMain.handle('patient-files:add', async (_event, medicalRecordId: number) => PatientFilesService.addPatientFiles(win, medicalRecordId));
  ipcMain.handle('patient-files:open', async (_event, medicalRecordId: number, storedName: string) => PatientFilesService.openPatientFile(medicalRecordId, storedName));
  ipcMain.handle('patient-files:delete', async (_event, medicalRecordId: number, storedName: string) => PatientFilesService.deletePatientFile(medicalRecordId, storedName));
  ipcMain.handle('patient-files:delete-record', async (_event, medicalRecordId: number) => PatientFilesService.deleteRecordFiles(medicalRecordId));
}

function registerAuthHandlers() {
  ipcMain.handle('auth:has-users', async () => AuthService.hasUsers());
  ipcMain.handle('auth:register', async (_event, username: string, password: string) => AuthService.registerUser(username, password));
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => AuthService.loginUser(username, password));
  ipcMain.handle('auth:logout', async () => AuthService.logoutUser());
  ipcMain.handle('auth:get-current-user', async () => AuthService.getCurrentUser());
  ipcMain.handle('auth:create-user', async (_event, username: string, password: string, role: string) => AuthService.createAdminUser(username, password, role));
  ipcMain.handle('auth:list-users', async () => AuthService.listUserAccounts());
  ipcMain.handle('auth:delete-user', async (_event, userId: number) => AuthService.deleteUserAccount(userId));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    icon: path.join(__dirname, '../dist/fc.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const showFallback = setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      win.show();
    }
  }, 1500);

  win.once('ready-to-show', () => {
    clearTimeout(showFallback);
    if (win && !win.isDestroyed() && !win.isVisible()) {
      win.show();
    }
  });

  win.webContents.on('did-finish-load', () => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      win.show();
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[renderer] did-fail-load', errorCode, errorDescription);
    if (process.env.VITE_DEV_SERVER_URL) {
      setTimeout(() => {
        if (win && !win.isDestroyed()) {
          win.loadURL(process.env.VITE_DEV_SERVER_URL!);
          if (!win.isVisible()) {
            win.show();
          }
        }
      }, 500);
    }
  });

  win.webContents.on('console-message', (event) => {
    console.log('[renderer console]', event.message, `${event.sourceId}:${event.lineNumber}`);
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
  registerSettingsHandlers();

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const connectSources = devServerUrl
    ? (() => {
        const url = new URL(devServerUrl);
        const websocketProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `connect-src 'self' ${url.origin} ${websocketProtocol}//${url.host};`;
      })()
    : "connect-src 'self';";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; ${connectSources} object-src 'none'; base-uri 'self';`,
        ],
      },
    });
  });

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

// Ctrl+C (dev mode) / `kill` send SIGINT or SIGTERM directly to this process; Electron
// doesn't turn those into a 'before-quit' quit sequence on its own, so without this the
// embedded Postgres process (and its port 5432) would be orphaned on every such exit.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.quit();
  });
}
