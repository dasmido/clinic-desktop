import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { queryDatabase, startDatabase, stopDatabase, type QueryValue } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let win: BrowserWindow | null;

type AuthUser = { id: number; username: string; role: string };

// Session lives only in memory for the running instance; login is required every launch.
let currentSessionUser: AuthUser | null = null;

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

async function createUser(username: string, password: string, role: string): Promise<AuthUser> {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await queryDatabase(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
    [username.trim(), passwordHash, role],
  );
  return result.rows[0] as AuthUser;
}

function registerAuthHandlers() {
  ipcMain.handle('auth:has-users', async () => {
    const result = await queryDatabase('SELECT COUNT(*) AS count FROM users');
    return Number(result.rows[0]?.count ?? 0) > 0;
  });

  ipcMain.handle('auth:register', async (_event, username: string, password: string) => {
    assertValidCredentials(username, password);

    const existing = await queryDatabase('SELECT COUNT(*) AS count FROM users');
    const hasUsers = Number(existing.rows[0]?.count ?? 0) > 0;

    if (hasUsers && currentSessionUser?.role !== 'admin') {
      throw new Error('Registration is closed. Ask an administrator to create your account.');
    }

    const role = hasUsers ? 'staff' : 'admin';
    const user = await createUser(username, password, role);

    if (!hasUsers) {
      currentSessionUser = user;
    }

    return user;
  });

  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    assertValidCredentials(username, password);

    const result = await queryDatabase(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username.trim()],
    );
    const row = result.rows[0] as { id: number; username: string; password_hash: string; role: string } | undefined;

    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new Error('Invalid username or password.');
    }

    currentSessionUser = { id: row.id, username: row.username, role: row.role };
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
    return createUser(username, password, role === 'admin' ? 'admin' : 'staff');
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

app.whenReady().then(async () => {
  registerDatabaseHandlers();
  registerAuthHandlers();
  await startDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  void stopDatabase();
});