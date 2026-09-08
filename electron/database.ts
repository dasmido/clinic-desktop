import EmbeddedPostgres from 'embedded-postgres';
import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

export type QueryValue = string | number | boolean | Date | null;

const APPLICATION_DATABASE = 'clinic_desktop';

let postgres: EmbeddedPostgres | null = null;
let startup: Promise<EmbeddedPostgres> | null = null;

export type DatabaseQueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number | null;
};

function getDatabaseDir() {
  return path.join(app.getPath('userData'), 'postgres');
}

async function databaseClusterExists() {
  try {
    await fs.access(path.join(getDatabaseDir(), 'PG_VERSION'));
    return true;
  } catch {
    return false;
  }
}

function createEmbeddedPostgres() {
  return new EmbeddedPostgres({
    databaseDir: getDatabaseDir(),
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });
}

async function ensureApplicationDatabase(instance: EmbeddedPostgres) {
  const client = instance.getPgClient();

  await client.connect();
  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      APPLICATION_DATABASE,
    ]);

    if (result.rowCount === 0) {
      await instance.createDatabase(APPLICATION_DATABASE);
    }
  } finally {
    await client.end();
  }
}

export async function startDatabase() {
  if (postgres) return postgres;

  startup ??= (async () => {
    const instance = createEmbeddedPostgres();
    const shouldInitialise = !(await databaseClusterExists());

    if (shouldInitialise) {
      await instance.initialise();
    }

    await instance.start();
    await ensureApplicationDatabase(instance);
    postgres = instance;
    return instance;
  })();

  return startup;
}

export async function queryDatabase(
  text: string,
  values: QueryValue[] = [],
): Promise<DatabaseQueryResult> {
  const instance = await startDatabase();
  const client = instance.getPgClient(APPLICATION_DATABASE);

  await client.connect();
  try {
    const result = await client.query(text, values);

    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    await client.end();
  }
}

export async function stopDatabase() {
  if (!postgres) return;

  await postgres.stop();
  postgres = null;
  startup = null;
}