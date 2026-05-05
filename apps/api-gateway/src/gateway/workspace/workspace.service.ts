import { Inject, Injectable } from '@nestjs/common';
import {
  ProcessingRequestsRepository,
  TransactionsRepository,
  type databaseType,
} from '@repo/database';
import { DATABASE_CONNECTION } from '../database/database.constants';

@Injectable()
export class WorkspaceService {
  private readonly processingRequestsRepository: ProcessingRequestsRepository;
  private readonly transactionsRepository: TransactionsRepository;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: databaseType,
  ) {
    this.processingRequestsRepository = new ProcessingRequestsRepository(db);
    this.transactionsRepository = new TransactionsRepository(db);
  }

  async getProcessingRequestDetail(requestId: string) {
    const request = await this.processingRequestsRepository.findById(requestId);
    const transactions = await this.transactionsRepository.listForProcessingRequest(requestId);

    return {
      request,
      transactions: transactions.map((item) => ({
        transaction: item.transaction,
        review: item.review,
        category: item.category,
      })),
    };
  }

  async listPendingReviews(userId: string) {
    const items = await this.transactionsRepository.listPendingReviewQueue(userId);

    return {
      items: items.map((item) => ({
        transaction: item.transaction,
        review: item.review,
      })),
    };
  }

  async listRecentTransactions(userId: string) {
    const items = await this.transactionsRepository.listRecent(userId);

    return {
      items: items.map((item) => ({
        transaction: item.transaction,
        review: item.review,
        category: item.category,
      })),
    };
  }
}
