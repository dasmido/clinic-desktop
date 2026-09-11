import { app } from 'electron';
import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from '../src/database/types.js';

const APPLICATION_DATABASE = 'clinic_desktop';
const require = createRequire(import.meta.url);
const BIN_PERMISSIONS = 0o555;

type PostgresInstance = {
  process: ChildProcessWithoutNullStreams | null;
  ownsProcess: boolean;
  pid?: number;
};

let postgres: PostgresInstance | null = null;
let startup: Promise<PostgresInstance> | null = null;
let db: Kysely<Database> | null = null;

// Keep date/time columns as raw text (matching Postgres' own text output) instead of
// letting node-postgres parse them into JS Date objects, so repositories can select
// columns directly without per-query `::text` casts.
const DATE_OID = 1082;
const TIME_OID = 1083;
const TIMESTAMP_OID = 1114;
const TIMESTAMPTZ_OID = 1184;
const identity = (value: string) => value;
pg.types.setTypeParser(DATE_OID, identity);
pg.types.setTypeParser(TIME_OID, identity);
pg.types.setTypeParser(TIMESTAMP_OID, identity);
pg.types.setTypeParser(TIMESTAMPTZ_OID, identity);

function getDatabaseDir() {
  return path.join(app.getPath('userData'), 'postgres');
}

function getBestLocale() {
  try {
    const availableLocales = new Set(
      execSync('locale -a', { encoding: 'utf8' })
        .split(/\r?\n/)
        .map((locale) => locale.trim())
        .filter(Boolean),
    );

    if (availableLocales.has('en_US.UTF-8')) return 'en_US.UTF-8';
    if (availableLocales.has('C.UTF-8')) return 'C.UTF-8';
    if (availableLocales.has('en_US.utf8')) return 'en_US.utf8';
  } catch {
    // Fall back to the POSIX locale when `locale -a` is unavailable.
  }

  return 'C';
}

function getNativePackageName() {
  if (process.platform === 'darwin') {
    if (process.arch === 'arm64') return '@embedded-postgres/darwin-arm64';
    if (process.arch === 'x64') return '@embedded-postgres/darwin-x64';
  }

  if (process.platform === 'linux') {
    if (process.arch === 'arm64') return '@embedded-postgres/linux-arm64';
    if (process.arch === 'arm') return '@embedded-postgres/linux-arm';
    if (process.arch === 'ia32') return '@embedded-postgres/linux-ia32';
    if (process.arch === 'ppc64') return '@embedded-postgres/linux-ppc64';
    if (process.arch === 'x64') return '@embedded-postgres/linux-x64';
  }

  if (process.platform === 'win32' && process.arch === 'x64') {
    return '@embedded-postgres/windows-x64';
  }

  throw new Error(`Unsupported embedded Postgres platform: ${process.platform}/${process.arch}`);
}

function getUnpackedPath(filePath: string) {
  return app.isPackaged
    ? filePath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
    : filePath;
}

function getBinaryPath(binaryName: 'initdb' | 'postgres') {
  const nativePackageName = getNativePackageName();
  const packageRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'postgres', nativePackageName.replace('@embedded-postgres/', ''))
    : path.resolve(path.dirname(require.resolve(nativePackageName)), '..');
  const executableName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;

  return getUnpackedPath(path.join(packageRoot, 'native', 'bin', executableName));
}

async function ensureBinIsExecutable(filePath: string) {
  const stat = await fs.stat(filePath);

  if ((stat.mode & BIN_PERMISSIONS) !== BIN_PERMISSIONS) {
    await fs.chmod(filePath, stat.mode | BIN_PERMISSIONS);
  }
}

async function databaseClusterExists() {
  try {
    await fs.access(path.join(getDatabaseDir(), 'PG_VERSION'));
    return true;
  } catch {
    return false;
  }
}

function createPgClient(database = 'postgres') {
  const { Client } = pg;

  return new Client({
    database,
    host: 'localhost',
    password: 'password',
    port: 5432,
    user: 'postgres',
  });
}

function createPgPool() {
  const { Pool } = pg;

  return new Pool({
    database: APPLICATION_DATABASE,
    host: 'localhost',
    password: 'password',
    port: 5432,
    user: 'postgres',
  });
}

async function initialiseDatabaseCluster() {
  const initdb = getBinaryPath('initdb');
  const locale = getBestLocale();
  const passwordFile = path.resolve(os.tmpdir(), `clinic-desktop-postgres-password-${crypto.randomUUID()}`);

  await fs.mkdir(getDatabaseDir(), { recursive: true });
  await fs.writeFile(passwordFile, 'password\n');
  await ensureBinIsExecutable(initdb);

  try {
    await new Promise<void>((resolve, reject) => {
      const childProcess = spawn(initdb, [
        `--pgdata=${getDatabaseDir()}`,
        '--auth=password',
        '--username=postgres',
        `--pwfile=${passwordFile}`,
        `--lc-messages=${locale}`,
      ], {
        env: { ...process.env, LC_MESSAGES: locale },
      });

      let stderrOutput = '';

      childProcess.stderr.on('data', (chunk) => {
        stderrOutput += chunk.toString('utf8');
      });

      childProcess.on('error', reject);
      childProcess.on('close', (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Postgres init failed (code: ${code ?? 'null'}, signal: ${signal ?? 'null'}). ${stderrOutput}`));
      });
    });
  } finally {
    await fs.unlink(passwordFile).catch(() => undefined);
  }
}

async function startPostgresProcess() {
  const postgresBinary = getBinaryPath('postgres');
  const locale = getBestLocale();

  await ensureBinIsExecutable(postgresBinary);

  // Reuse a server left behind by an interrupted Electron process.
  const existingClient = createPgClient();
  try {
    await existingClient.connect();
    await existingClient.end();
    const postmasterPid = await fs.readFile(path.join(getDatabaseDir(), 'postmaster.pid'), 'utf8')
      .then((contents) => Number.parseInt(contents.split(/\r?\n/, 1)[0], 10))
      .catch(() => Number.NaN);

    return Number.isInteger(postmasterPid) && postmasterPid > 0
      ? { process: null, ownsProcess: true, pid: postmasterPid } satisfies PostgresInstance
      : { process: null, ownsProcess: false } satisfies PostgresInstance;
  } catch {
    await existingClient.end().catch(() => undefined);
  }

  return new Promise<PostgresInstance>((resolve, reject) => {
    const childProcess = spawn(postgresBinary, ['-D', getDatabaseDir(), '-p', '5432'], {
      env: { ...process.env, LC_MESSAGES: locale },
    });

    let stderrOutput = '';
    let settled = false;

    childProcess.stderr.on('data', (chunk) => {
      const message = chunk.toString('utf8');
      stderrOutput += message;

      if (!settled && message.includes('database system is ready to accept connections')) {
        settled = true;
        resolve({ process: childProcess, ownsProcess: true });
      }
    });

    childProcess.on('error', (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    childProcess.on('close', (code, signal) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Postgres exited before startup (code: ${code ?? 'null'}, signal: ${signal ?? 'null'}). ${stderrOutput}`));
      }
    });
  });
}

async function ensureApplicationDatabase() {
  const client = createPgClient();

  await client.connect();
  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      APPLICATION_DATABASE,
    ]);

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE ${APPLICATION_DATABASE}`);
    }
  } finally {
    await client.end();
  }
}

function getDatabaseMigrationRoots() {
  if (app.isPackaged) {
    return [
      path.join(process.resourcesPath, 'database', 'migrations'),
      path.join(app.getAppPath(), 'src', 'database', 'migrations'),
    ];
  }

  return [path.join(process.cwd(), 'src', 'database', 'migrations')];
}

async function getDatabaseMigrationFiles() {
  const migrationFiles = new Map<string, string>();

  for (const migrationRoot of getDatabaseMigrationRoots()) {
    const entries = await fs.readdir(migrationRoot, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.sql') || migrationFiles.has(entry.name)) continue;

      migrationFiles.set(entry.name, path.join(migrationRoot, entry.name));
    }
  }

  return [...migrationFiles.entries()].sort(([firstMigration], [secondMigration]) => (
    firstMigration.localeCompare(secondMigration)
  ));
}

async function applyDatabaseMigrations() {
  const migrationFiles = await getDatabaseMigrationFiles();
  const client = createPgClient(APPLICATION_DATABASE);

  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    for (const [migrationName, migrationFile] of migrationFiles) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [migrationName]);
      if (applied.rowCount) continue;

      const sql = await fs.readFile(migrationFile, 'utf8');
      if (!sql.trim()) continue;

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationName]);
        await client.query('COMMIT');
        console.info(`[database] applied migration ${migrationName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

export async function startDatabase() {
  if (postgres) return postgres;

  startup ??= (async () => {
    const shouldInitialise = !(await databaseClusterExists());

    if (shouldInitialise) {
      await initialiseDatabaseCluster();
    }

    const instance = await startPostgresProcess();
    await ensureApplicationDatabase();
    postgres = instance;
    await applyDatabaseMigrations();
    return instance;
  })().catch((error) => {
    startup = null;
    throw error;
  });

  return startup;
}

export async function getDatabase() {
  await startDatabase();

  db ??= new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: createPgPool(),
    }),
  });

  return db;
}

export async function stopDatabase() {
  await startup?.catch(() => undefined);
  await db?.destroy();
  db = null;

  if (!postgres || !postgres.ownsProcess) {
    postgres = null;
    startup = null;
    return;
  }

  const instance = postgres;

  if (!instance.process && instance.pid) {
    process.kill(instance.pid, 'SIGINT');
    await new Promise<void>((resolve) => {
      const waitForExit = () => {
        try {
          process.kill(instance.pid!, 0);
          setTimeout(waitForExit, 50);
        } catch {
          resolve();
        }
      };

      waitForExit();
    });
    postgres = null;
    startup = null;
    return;
  }

  await new Promise<void>((resolve) => {
    instance.process?.once('exit', () => resolve());
    instance.process?.kill('SIGINT');
  });

  postgres = null;
  startup = null;
}