import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase, queryDatabase, startDatabase, stopDatabase, type QueryValue } from './database.js';
import {
  countUsers,
  createUser,
  deleteUser,
  listUsers,
  verifyUserCredentials,
  type AuthUser,
} from './repositories/users.repository.js';

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

function registerDatabaseHandlers() {
  ipcMain.handle('database:is-ready', async () => {
    await startDatabase();
    return true;
  });

  ipcMain.handle('database:query', async (_event, text: string, values: QueryValue[] = []) => {
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Database query must be a non-empty string.');
    }

    return queryDatabase(text, values);
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

    const record = await queryDatabase('SELECT id FROM patient_medical_records WHERE id = $1', [medicalRecordId]);
    if (!record.rowCount) throw new Error('Medical record was not found.');

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