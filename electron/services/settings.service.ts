import type { AppSettingsUpdate } from '../../src/database/types.js';
import { getDatabase } from '../database.js';
import { getAppSettings, updateAppSettings } from '../repositories/settings.repository.js';
import { assertUserHasRole } from './auth.service.js';

export async function fetchAppSettings() {
  const db = await getDatabase();
  return getAppSettings(db);
}

export async function saveAppSettings(input: AppSettingsUpdate) {
  assertUserHasRole(['admin']);
  const db = await getDatabase();
  return updateAppSettings(db, input);
}
