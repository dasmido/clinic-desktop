import { sql, type Kysely } from 'kysely';
import type { Database, InventoryItem } from '../../src/database/types.js';

export type CreateInventoryItemInput = {
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
};

export type UpdateInventoryItemInput = {
  name: string;
  sku: string | null;
  unit: string;
  reorder_level: number;
  unit_cost: number;
};

export async function listInventoryItems(db: Kysely<Database>): Promise<InventoryItem[]> {
  return db
    .selectFrom('inventory_items')
    .selectAll()
    .orderBy('name', 'asc')
    .execute();
}

export async function createInventoryItem(
  db: Kysely<Database>,
  item: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const created = await db
    .insertInto('inventory_items')
    .values({
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      quantity: item.quantity,
      reorder_level: item.reorder_level,
      unit_cost: item.unit_cost,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  if (item.quantity > 0) {
    await addInventoryMovement(db, created.id, item.quantity, 'رصيد افتتاحي');
  }

  return created;
}

export async function updateInventoryItem(
  db: Kysely<Database>,
  itemId: number,
  item: UpdateInventoryItemInput,
): Promise<InventoryItem | undefined> {
  return db
    .updateTable('inventory_items')
    .set({
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      reorder_level: item.reorder_level,
      unit_cost: item.unit_cost,
      updated_at: new Date(),
    })
    .where('id', '=', itemId)
    .returningAll()
    .executeTakeFirst();
}

export async function deleteInventoryItem(db: Kysely<Database>, itemId: number) {
  return db
    .deleteFrom('inventory_items')
    .where('id', '=', itemId)
    .executeTakeFirst();
}

export async function addInventoryMovement(
  db: Kysely<Database>,
  itemId: number,
  quantityChange: number,
  reason: string,
  notes = '',
) {
  return db
    .insertInto('inventory_movements')
    .values({ inventory_item_id: itemId, quantity_change: quantityChange, reason, notes })
    .executeTakeFirst();
}

export async function adjustInventoryQuantity(
  db: Kysely<Database>,
  itemId: number,
  quantityChange: number,
  reason: string,
  notes = '',
): Promise<InventoryItem> {
  const updated = await db
    .updateTable('inventory_items')
    .set((eb) => ({
      quantity: eb('quantity', '+', quantityChange),
      updated_at: new Date(),
    }))
    .where('id', '=', itemId)
    .where(sql<boolean>`quantity + ${quantityChange} >= 0`)
    .returningAll()
    .executeTakeFirst();

  if (!updated) {
    throw new Error('لا يمكن أن تصبح كمية المخزون أقل من صفر.');
  }

  await addInventoryMovement(db, itemId, quantityChange, reason, notes);
  return updated;
}
