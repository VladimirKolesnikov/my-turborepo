import { eq } from "drizzle-orm";
import type { databaseType } from "../index";
import { transactionReviews } from "../schema";
import { REVIEW_DECISION_PENDING } from "../bootstrap";

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
