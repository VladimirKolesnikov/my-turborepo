import { and, desc, eq } from "drizzle-orm";
import type { databaseType } from "../index";
import { categories, transactionReviews, transactions } from "../schema";
import { REVIEW_DECISION_PENDING, TRANSACTION_STATUS_PENDING } from "../bootstrap";

type CreatePendingTransactionInput = {
  userId: string;
  walletId: string;
  processingRequestId?: string | null;
  amount?: string | null;
  currency: string;
  rawContent: string;
  statusCode?: string;
};

type UpdateProcessedTransactionInput = {
  amount: string;
  typeCode: string;
  statusCode: string;
};

export class TransactionsRepository {
  constructor(private readonly db: databaseType) {}

  async createPending(input: CreatePendingTransactionInput) {
    const [row] = await this.db
      .insert(transactions)
      .values({
        userId: input.userId,
        walletId: input.walletId,
        processingRequestId: input.processingRequestId ?? null,
        amount: input.amount ?? null,
        currency: input.currency,
        rawContent: input.rawContent,
        statusCode: input.statusCode ?? TRANSACTION_STATUS_PENDING,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create transaction");
    }

    return row;
  }

  async updateProcessed(transactionId: string, input: UpdateProcessedTransactionInput) {
    await this.db
      .update(transactions)
      .set({
        amount: input.amount,
        typeCode: input.typeCode,
        statusCode: input.statusCode,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));
  }

  async updateStatus(transactionId: string, statusCode: string) {
    await this.db
      .update(transactions)
      .set({ statusCode, updatedAt: new Date() })
      .where(eq(transactions.id, transactionId));
  }

  async setCategory(transactionId: string, categoryId: string, statusCode: string) {
    await this.db
      .update(transactions)
      .set({
        categoryId,
        statusCode,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));
  }

  async findById(transactionId: string) {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    return row ?? null;
  }

  async listRecent(userId: string, limit = 20) {
    return this.db
      .select({
        transaction: transactions,
        review: transactionReviews,
        category: categories,
      })
      .from(transactions)
      .leftJoin(transactionReviews, eq(transactionReviews.transactionId, transactions.id))
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async listPendingReviewQueue(userId: string) {
    return this.db
      .select({
        transaction: transactions,
        review: transactionReviews,
      })
      .from(transactions)
      .innerJoin(transactionReviews, eq(transactionReviews.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactionReviews.decisionStatus, REVIEW_DECISION_PENDING),
        ),
      )
      .orderBy(desc(transactions.createdAt));
  }

  async listForProcessingRequest(processingRequestId: string) {
    return this.db
      .select({
        transaction: transactions,
        review: transactionReviews,
        category: categories,
      })
      .from(transactions)
      .leftJoin(transactionReviews, eq(transactionReviews.transactionId, transactions.id))
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(eq(transactions.processingRequestId, processingRequestId))
      .orderBy(desc(transactions.createdAt));
  }
}
