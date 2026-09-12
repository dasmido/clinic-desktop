import { sql, type Kysely } from 'kysely';
import type { Database, FinancialTransaction, FinancialTransactionType } from '../../src/database/types.js';

export type FinanceSummary = { income: string; expenses: string };

export type FinancialTransactionWithPatient = FinancialTransaction & { patient_name: string | null };

export type CreateTransactionInput = {
  transaction_type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  occurred_on: string;
  patient_id?: number | null;
  lab_order_id?: number | null;
};

export async function getFinanceSummary(
  db: Kysely<Database>,
  monthStart: string,
): Promise<FinanceSummary> {
  const result = await db
    .selectFrom('financial_transactions')
    .select([
      sql<string>`coalesce(sum(amount) filter (where transaction_type = 'income'), 0)`.as('income'),
      sql<string>`coalesce(sum(amount) filter (where transaction_type = 'expense'), 0)`.as('expenses'),
    ])
    .where('occurred_on', '>=', monthStart)
    .executeTakeFirst();

  return {
    income: result?.income ?? '0',
    expenses: result?.expenses ?? '0',
  };
}

export async function listTransactions(
  db: Kysely<Database>,
  limit = 100,
): Promise<FinancialTransactionWithPatient[]> {
  return db
    .selectFrom('financial_transactions')
    .leftJoin('patients', 'patients.id', 'financial_transactions.patient_id')
    .selectAll('financial_transactions')
    .select('patients.full_name as patient_name')
    .orderBy('financial_transactions.occurred_on', 'desc')
    .orderBy('financial_transactions.id', 'desc')
    .limit(limit)
    .execute();
}

export async function createTransaction(
  db: Kysely<Database>,
  transaction: CreateTransactionInput,
): Promise<FinancialTransaction> {
  return db
    .insertInto('financial_transactions')
    .values(transaction)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTransaction(db: Kysely<Database>, transactionId: number) {
  return db
    .deleteFrom('financial_transactions')
    .where('id', '=', transactionId)
    .executeTakeFirst();
}
