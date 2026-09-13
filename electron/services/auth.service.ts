import { getDatabase } from '../database.js';
import {
  countUsers,
  createUser as repoCreateUser,
  deleteUser as repoDeleteUser,
  listUsers as repoListUsers,
  verifyUserCredentials,
  type AuthUser,
} from '../repositories/users.repository.js';

let currentSessionUser: AuthUser | null = null;

const userRoles = new Set<AuthUser['role']>([
  'doctor',
  'nurse',
  'lab',
  'pharmacy',
  'moderator',
  'admin',
]);

export function getCurrentUser(): AuthUser | null {
  return currentSessionUser;
}

export function assertSignedIn(): AuthUser {
  if (!currentSessionUser) {
    throw new Error('Please sign in before accessing clinic data.');
  }
  return currentSessionUser;
}

export function assertUserHasRole(allowedRoles: readonly AuthUser['role'][]): AuthUser {
  const user = currentSessionUser;

  if (!user) {
    throw new Error('Please sign in before accessing clinic data.');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error('You do not have permission to perform this action.');
  }

  return user;
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

export async function hasUsers(): Promise<boolean> {
  const db = await getDatabase();
  return (await countUsers(db)) > 0;
}

export async function registerUser(username: string, password: string): Promise<AuthUser> {
  assertValidCredentials(username, password);

  const db = await getDatabase();
  const userCount = await countUsers(db);
  const hasExistingUsers = userCount > 0;

  if (hasExistingUsers && currentSessionUser?.role !== 'admin') {
    throw new Error('Registration is closed. Ask an administrator to create your account.');
  }

  const role = hasExistingUsers ? 'nurse' : 'admin';
  const user = await repoCreateUser(db, username, password, role);

  if (!hasExistingUsers) {
    currentSessionUser = user;
  }

  return user;
}

export async function loginUser(username: string, password: string): Promise<AuthUser> {
  assertValidCredentials(username, password);

  const db = await getDatabase();
  const user = await verifyUserCredentials(db, username, password);

  if (!user) {
    throw new Error('Invalid username or password.');
  }

  currentSessionUser = user;
  return currentSessionUser;
}

export async function logoutUser(): Promise<boolean> {
  currentSessionUser = null;
  return true;
}

export async function createAdminUser(username: string, password: string, role: string): Promise<AuthUser> {
  if (currentSessionUser?.role !== 'admin') {
    throw new Error('Only an administrator can create new users.');
  }
  assertValidCredentials(username, password);
  assertValidUserRole(role);
  const db = await getDatabase();
  return repoCreateUser(db, username, password, role);
}

export async function listUserAccounts(): Promise<AuthUser[]> {
  if (currentSessionUser?.role !== 'admin') {
    throw new Error('Only an administrator can view user accounts.');
  }
  const db = await getDatabase();
  return repoListUsers(db);
}

export async function deleteUserAccount(userId: number): Promise<boolean> {
  if (currentSessionUser?.role !== 'admin') throw new Error('Only an administrator can delete user accounts.');
  if (!Number.isInteger(userId) || userId < 1) throw new Error('Invalid user account.');
  if (userId === currentSessionUser.id) throw new Error('You cannot delete the account currently signed in.');

  const db = await getDatabase();
  const target = await db.selectFrom('users').select(['role']).where('id', '=', userId).executeTakeFirst();
  if (!target) throw new Error('User account was not found.');
  if (target.role === 'admin' && (await countUsers(db)) === 1) throw new Error('The last administrator account cannot be deleted.');
  await repoDeleteUser(db, userId);
  return true;
}
