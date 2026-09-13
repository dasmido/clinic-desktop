import { getDatabase } from '../database.js';
import {
  adjustInventoryQuantity as repoAdjustInventoryQuantity,
  createInventoryItem as repoCreateInventoryItem,
  deleteInventoryItem as repoDeleteInventoryItem,
  listInventoryItems as repoListInventoryItems,
  updateInventoryItem as repoUpdateInventoryItem,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
} from '../repositories/inventory.repository.js';
import { assertSignedIn } from './auth.service.js';

export async function listInventoryItems() {
  assertSignedIn();
  const db = await getDatabase();
  return repoListInventoryItems(db);
}

export async function createInventoryItem(input: CreateInventoryItemInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoCreateInventoryItem(db, input);
}

export async function updateInventoryItem(itemId: number, input: UpdateInventoryItemInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoUpdateInventoryItem(db, itemId, input);
}

export async function deleteInventoryItem(itemId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoDeleteInventoryItem(db, itemId);
  return true;
}

export async function adjustInventoryQuantity(itemId: number, quantityChange: number, reason: string, notes?: string) {
  assertSignedIn();
  const db = await getDatabase();
  return repoAdjustInventoryQuantity(db, itemId, quantityChange, reason, notes);
}
