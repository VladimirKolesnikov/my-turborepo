import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CategoriesRepository,
  eq,
  REVIEW_DECISION_CONFIRMED,
  TransactionReviewsRepository,
  transactions,
  TRANSACTION_STATUS_CONFIRMED,
  TransactionsRepository,
} from '@repo/database';
import { TRANSACTION_CONFIRMATION_QUEUE } from '@repo/constants';
import { DatabaseService } from '../database/database.service';

export interface ConfirmTransactionDto {
  categoryName: string;
  description: string;
}

@Injectable()
export class ConfirmationService {
  private readonly categoriesRepository: CategoriesRepository;
  private readonly transactionsRepository: TransactionsRepository;
  private readonly transactionReviewsRepository: TransactionReviewsRepository;

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue(TRANSACTION_CONFIRMATION_QUEUE) private readonly confirmationQueue: Queue,
  ) {
    this.categoriesRepository = new CategoriesRepository(databaseService.db);
    this.transactionsRepository = new TransactionsRepository(databaseService.db);
    this.transactionReviewsRepository = new TransactionReviewsRepository(databaseService.db);
  }

  async confirm(
    transactionId: string,
    dto: ConfirmTransactionDto,
  ): Promise<{ transactionId: string }> {
    if (!dto?.categoryName || !dto?.description) {
      throw new BadRequestException(
        'Request body must be JSON with "categoryName" and "description" fields',
      );
    }

    const [existing] = await this.databaseService.db
      .select({ id: transactions.id, userId: transactions.userId })
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!existing) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    let category = await this.categoriesRepository.findByUserAndName(
      existing.userId,
      dto.categoryName,
    );

    if (!category) {
      category = await this.categoriesRepository.createForUser(
        existing.userId,
        dto.categoryName,
      );
    }

    await this.transactionsRepository.setCategory(
      transactionId,
      category.id,
      TRANSACTION_STATUS_CONFIRMED,
    );

    await this.transactionReviewsRepository.confirm({
      transactionId,
      finalCategoryName: dto.categoryName,
      finalDescription: dto.description,
      decisionStatus: REVIEW_DECISION_CONFIRMED,
    });

    await this.confirmationQueue.add('embed', {
      transactionId,
      confirmedCategoryName: dto.categoryName,
      content: dto.description,
    });

    return { transactionId };
  }
}
