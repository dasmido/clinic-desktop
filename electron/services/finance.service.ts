import { getDatabase } from '../database.js';
import {
  createTransaction as repoCreateTransaction,
  deleteTransaction as repoDeleteTransaction,
  getFinanceSummary as repoGetFinanceSummary,
  listTransactions as repoListTransactions,
  type CreateTransactionInput,
} from '../repositories/finance.repository.js';
import { assertSignedIn } from './auth.service.js';

export async function getFinanceSummary(monthStart: string) {
  assertSignedIn();
  const db = await getDatabase();
  return repoGetFinanceSummary(db, monthStart);
}

export async function listTransactions(limit?: number) {
  assertSignedIn();
  const db = await getDatabase();
  return repoListTransactions(db, limit);
}

export async function createTransaction(input: CreateTransactionInput) {
  assertSignedIn();
  const db = await getDatabase();
  return repoCreateTransaction(db, input);
}

export async function deleteTransaction(transactionId: number) {
  assertSignedIn();
  const db = await getDatabase();
  await repoDeleteTransaction(db, transactionId);
  return true;
}
