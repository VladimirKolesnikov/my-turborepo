import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';
import { CsvParserStrategy } from './strategies/csv-parser.strategy';
import { transactions } from '@repo/database';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { TRANSACTIONS_QUEUE } from '../queue/queue.constants';

// const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEMP_WALLET_ID = '00000000-0000-0000-0000-000000000001';

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
        walletId: TEMP_WALLET_ID,
        amount: '0',
        rawContent: parsedText,
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
