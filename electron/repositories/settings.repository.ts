import type { Kysely } from 'kysely';
import type { AppSettings, AppSettingsUpdate, Database } from '../../src/database/types.js';

export async function getAppSettings(db: Kysely<Database>): Promise<AppSettings> {
  return db
    .selectFrom('app_settings')
    .selectAll()
    .where('id', '=', 1)
    .executeTakeFirstOrThrow();
}

export async function updateAppSettings(
  db: Kysely<Database>,
  input: AppSettingsUpdate,
): Promise<AppSettings> {
  return db
    .updateTable('app_settings')
    .set({ ...input, updated_at: new Date() })
    .where('id', '=', 1)
    .returningAll()
    .executeTakeFirstOrThrow();
}
