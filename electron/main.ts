import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase, queryDatabase, startDatabase, stopDatabase, type QueryValue } from './database.js';
import {
  countUsers,
  createUser,
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