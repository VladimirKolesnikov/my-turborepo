import { and, desc, eq, ilike } from "drizzle-orm";
import type { databaseType } from "./index";
import {
  categories,
  processingRequests,
  transactionReviews,
  transactions,
} from "./schema";
import {
  CATEGORY_TYPE_EXPENSE,
  PROCESSING_REQUEST_STATUS_QUEUED,
  REVIEW_DECISION_PENDING,
  TRANSACTION_STATUS_PENDING,
} from "./bootstrap";

type CreateProcessingRequestInput = {
  userId: string;
  sourceType: string;
  sourceName?: string | null;
  rawContent: string;
  statusCode?: string;
};

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

type UpsertReviewProposalInput = {
  transactionId: string;
  proposedCategoryName: string;
  proposedDescription: string;
  confidence: string;
  decisionStatus?: string;
};

type ConfirmReviewInput = {
  transactionId: string;
  finalCategoryName: string;
  finalDescription: string;
  decisionStatus: string;
};

export class ProcessingRequestsRepository {
  constructor(private readonly db: databaseType) {}

  async create(input: CreateProcessingRequestInput) {
    const [row] = await this.db
      .insert(processingRequests)
      .values({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceName: input.sourceName ?? null,
        rawContent: input.rawContent,
        statusCode: input.statusCode ?? PROCESSING_REQUEST_STATUS_QUEUED,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create processing request");
    }

    return row;
  }

  async updateStatus(
    id: string,
    statusCode: string,
    errorMessage?: string | null,
  ) {
    await this.db
      .update(processingRequests)
      .set({
        statusCode,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(processingRequests.id, id));
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(processingRequests)
      .where(eq(processingRequests.id, id));

    return row ?? null;
  }
}

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

export class TransactionReviewsRepository {
  constructor(private readonly db: databaseType) {}

  async upsertProposal(input: UpsertReviewProposalInput) {
    await this.db
      .insert(transactionReviews)
      .values({
        transactionId: input.transactionId,
        proposedCategoryName: input.proposedCategoryName,
        proposedDescription: input.proposedDescription,
        confidence: input.confidence,
        decisionStatus: input.decisionStatus ?? REVIEW_DECISION_PENDING,
      })
      .onConflictDoUpdate({
        target: transactionReviews.transactionId,
        set: {
          proposedCategoryName: input.proposedCategoryName,
          proposedDescription: input.proposedDescription,
          confidence: input.confidence,
          decisionStatus: input.decisionStatus ?? REVIEW_DECISION_PENDING,
          updatedAt: new Date(),
        },
      });
  }

  async confirm(input: ConfirmReviewInput) {
    await this.db
      .update(transactionReviews)
      .set({
        finalCategoryName: input.finalCategoryName,
        finalDescription: input.finalDescription,
        decisionStatus: input.decisionStatus,
        updatedAt: new Date(),
      })
      .where(eq(transactionReviews.transactionId, input.transactionId));
  }

  async findByTransactionId(transactionId: string) {
    const [row] = await this.db
      .select()
      .from(transactionReviews)
      .where(eq(transactionReviews.transactionId, transactionId));

    return row ?? null;
  }
}

export class CategoriesRepository {
  constructor(private readonly db: databaseType) {}

  async findByUserAndName(userId: string, name: string) {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), ilike(categories.name, name)));

    return row ?? null;
  }

  async createForUser(userId: string, name: string, categoryType = CATEGORY_TYPE_EXPENSE) {
    const [row] = await this.db
      .insert(categories)
      .values({
        userId,
        name,
        typeCode: categoryType,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create category");
    }

    return row;
  }
}
