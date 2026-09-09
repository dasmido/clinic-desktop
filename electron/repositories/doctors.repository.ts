import { sql, type Kysely } from 'kysely';
import type { Database, Doctor, DoctorAvailability } from '../../src/database/types.js';

export async function listDoctors(db: Kysely<Database>): Promise<Doctor[]> {
  return db
    .selectFrom('doctors')
    .selectAll()
    .orderBy('display_name', 'asc')
    .execute();
}

export async function createDoctorProfile(
  db: Kysely<Database>,
  userId: number,
  displayName: string,
) {
  return db
    .insertInto('doctors')
    .values({ user_id: userId, display_name: displayName })
    .onConflict((oc) => oc.column('user_id').doNothing())
    .executeTakeFirst();
}

export async function deleteDoctor(db: Kysely<Database>, doctorId: number) {
  return db
    .deleteFrom('doctors')
    .where('id', '=', doctorId)
    .executeTakeFirst();
}

export async function listDoctorAvailability(
  db: Kysely<Database>,
  doctorId: number,
): Promise<DoctorAvailability[]> {
  return db
    .selectFrom('doctor_availability')
    .selectAll()
    .where('doctor_id', '=', doctorId)
    .orderBy('day_of_week', 'asc')
    .orderBy('starts_at', 'asc')
    .execute();
}

export async function addDoctorAvailability(
  db: Kysely<Database>,
  doctorId: number,
  dayOfWeek: number,
  startsAt: string,
  endsAt: string,
) {
  return db
    .insertInto('doctor_availability')
    .values({ doctor_id: doctorId, day_of_week: dayOfWeek, starts_at: startsAt, ends_at: endsAt })
    .onConflict((oc) => oc.doNothing())
    .executeTakeFirst();
}

export async function removeDoctorAvailability(db: Kysely<Database>, availabilityId: number) {
  return db
    .deleteFrom('doctor_availability')
    .where('id', '=', availabilityId)
    .executeTakeFirst();
}

export async function isDoctorAvailableForSlot(
  db: Kysely<Database>,
  doctorId: number,
  startsAt: Date,
  endsAt: Date,
): Promise<boolean> {
  const result = await sql<{ id: number }>`
    SELECT id FROM doctor_availability
    WHERE doctor_id = ${doctorId}
      AND day_of_week = EXTRACT(DOW FROM ${startsAt}::timestamptz)::integer
      AND starts_at <= ${startsAt}::timestamptz::time
      AND ends_at >= ${endsAt}::timestamptz::time
    LIMIT 1
  `.execute(db);

  return result.rows.length > 0;
}
