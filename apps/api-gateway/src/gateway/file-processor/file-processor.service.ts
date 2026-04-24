import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BOOTSTRAP_SPENDING_WALLET_ID,
  DEFAULT_CURRENCY,
  TRANSACTION_STATUS_PENDING,
  transactions,
} from '@repo/database';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { TRANSACTIONS_QUEUE } from '../queue/queue.constants';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';
import { CsvParserStrategy } from './strategies/csv-parser.strategy';

@Injectable()
export class FileProcessorService {
  constructor(
    private readonly txtStrategy: TxtParserStrategy,
    private readonly csvStrategy: CsvParserStrategy,
    @Inject(DATABASE_CONNECTION)
    private readonly db,
    @InjectQueue(TRANSACTIONS_QUEUE)
    private readonly transactionsQueue: Queue,
  ) {}

  async processFile(
    userId: string,
    mimetype: string,
    buffer: Buffer,
  ): Promise<{ raw_content: string }> {
    let parsedText: string;

    switch (mimetype) {
      case 'text/plain':
        parsedText = await this.txtStrategy.parse(buffer);
        break;
      case 'text/csv':
        parsedText = await this.csvStrategy.parse(buffer);
        break;
      default:
        throw new BadRequestException('Unsupported mimetype');
    }

    const resultObject = { raw_content: parsedText };

    const [insertedTransaction] = await this.db
      .insert(transactions)
      .values({
        userId,
        walletId: BOOTSTRAP_SPENDING_WALLET_ID,
        currency: DEFAULT_CURRENCY,
        rawContent: parsedText,
        statusCode: TRANSACTION_STATUS_PENDING,
      })
      .returning({ id: transactions.id });

    if (insertedTransaction?.id) {
      await this.transactionsQueue.add('transaction', {
        transactionId: insertedTransaction.id,
      });
    }

    return resultObject;
  }
}
