import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  eq,
  transactions,
  TRANSACTION_STATUS_CONFIRMED,
  databaseType,
} from '@repo/database';
import { TRANSACTION_CONFIRMATION_QUEUE } from '@repo/constants';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface ConfirmTransactionDto {
  categoryName: string;
  description: string;
}

@Injectable()
export class ConfirmationService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: databaseType,
    @InjectQueue(TRANSACTION_CONFIRMATION_QUEUE) private readonly confirmationQueue: Queue,
  ) {}

  async confirm(
    transactionId: string,
    dto: ConfirmTransactionDto,
  ): Promise<{ transactionId: string }> {
    if (!dto?.categoryName || !dto?.description) {
      throw new BadRequestException(
        'Request body must be JSON with "categoryName" and "description" fields',
      );
    }

    const [existing] = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!existing) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    await this.db
      .update(transactions)
      .set({ statusCode: TRANSACTION_STATUS_CONFIRMED })
      .where(eq(transactions.id, transactionId));

    await this.confirmationQueue.add('embed', {
      transactionId,
      confirmedCategoryName: dto.categoryName,
      content: dto.description,
    });

    return { transactionId };
  }
}
