import { sql, type Kysely } from 'kysely';
import type { Database, FinancialTransaction, FinancialTransactionType } from '../../src/database/types.js';

export type FinanceSummary = { income: string; expenses: string };

export type CreateTransactionInput = {
  transaction_type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  occurred_on: string;
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
): Promise<FinancialTransaction[]> {
  return db
    .selectFrom('financial_transactions')
    .selectAll()
    .orderBy('occurred_on', 'desc')
    .orderBy('id', 'desc')
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
