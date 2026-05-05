import { Injectable } from '@nestjs/common';
import {
  ProcessingRequestsRepository,
  TransactionsRepository,
} from '@repo/database';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WorkspaceService {
  private readonly processingRequestsRepository: ProcessingRequestsRepository;
  private readonly transactionsRepository: TransactionsRepository;

  constructor(private readonly databaseService: DatabaseService) {
    this.processingRequestsRepository = new ProcessingRequestsRepository(databaseService.db);
    this.transactionsRepository = new TransactionsRepository(databaseService.db);
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
