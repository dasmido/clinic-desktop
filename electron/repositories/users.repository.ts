import bcrypt from 'bcryptjs';
import type { Kysely } from 'kysely';
import type { Database, UserRole } from '../../src/database/types.js';

export type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
};

type UserCredentials = AuthUser & {
  password_hash: string;
};

export async function countUsers(db: Kysely<Database>) {
  const result = await db
    .selectFrom('users')
    .select((expressionBuilder) => expressionBuilder.fn.countAll<string>().as('count'))
    .executeTakeFirstOrThrow();

  return Number(result.count);
}

export async function listUsers(db: Kysely<Database>): Promise<AuthUser[]> {
  return db
    .selectFrom('users')
    .select(['id', 'username', 'role'])
    .orderBy('username', 'asc')
    .execute();
}

export async function createUser(
  db: Kysely<Database>,
  username: string,
  password: string,
  role: UserRole,
): Promise<AuthUser> {
  const passwordHash = await bcrypt.hash(password, 10);

  return db
    .insertInto('users')
    .values({
      username: username.trim(),
      password_hash: passwordHash,
      role,
    })
    .returning(['id', 'username', 'role'])
    .executeTakeFirstOrThrow();
}

export async function deleteUser(db: Kysely<Database>, userId: number) {
  return db
    .deleteFrom('users')
    .where('id', '=', userId)
    .executeTakeFirst();
}

export async function verifyUserCredentials(
  db: Kysely<Database>,
  username: string,
  password: string,
): Promise<AuthUser | null> {
  const user = await db
    .selectFrom('users')
    .select(['id', 'username', 'password_hash', 'role'])
    .where('username', '=', username.trim())
    .executeTakeFirst() as UserCredentials | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}