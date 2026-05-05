import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BOOTSTRAP_SPENDING_WALLET_ID,
  DEFAULT_CURRENCY,
  PROCESSING_REQUEST_STATUS_QUEUED,
  PROCESSING_SOURCE_TYPE_CSV_FILE,
  PROCESSING_SOURCE_TYPE_TEXT,
  PROCESSING_SOURCE_TYPE_TXT_FILE,
  ProcessingRequestsRepository,
  TRANSACTION_STATUS_PENDING,
  TransactionsRepository,
} from '@repo/database';
import { DatabaseService } from '../database/database.service';
import { TRANSACTIONS_QUEUE } from '../queue/queue.constants';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';
import { CsvParserStrategy } from './strategies/csv-parser.strategy';

export interface SubmissionAcceptedResponse {
  requestId: string;
  statusCode: string;
}

@Injectable()
export class FileProcessorService {
  private readonly processingRequestsRepository: ProcessingRequestsRepository;
  private readonly transactionsRepository: TransactionsRepository;

  constructor(
    private readonly txtStrategy: TxtParserStrategy,
    private readonly csvStrategy: CsvParserStrategy,
    private readonly databaseService: DatabaseService,
    @InjectQueue(TRANSACTIONS_QUEUE)
    private readonly transactionsQueue: Queue,
  ) {
    this.processingRequestsRepository = new ProcessingRequestsRepository(databaseService.db);
    this.transactionsRepository = new TransactionsRepository(databaseService.db);
  }

  async processText(
    userId: string,
    rawContent: string,
  ): Promise<SubmissionAcceptedResponse> {
    return this.createAndQueueSubmission(userId, PROCESSING_SOURCE_TYPE_TEXT, null, rawContent);
  }

  async processFile(
    userId: string,
    mimetype: string,
    buffer: Buffer,
    filename?: string,
  ): Promise<SubmissionAcceptedResponse> {
    let parsedText: string;
    let sourceType: string;

    switch (mimetype) {
      case 'text/plain':
        parsedText = await this.txtStrategy.parse(buffer);
        sourceType = PROCESSING_SOURCE_TYPE_TXT_FILE;
        break;
      case 'text/csv':
        parsedText = await this.csvStrategy.parse(buffer);
        sourceType = PROCESSING_SOURCE_TYPE_CSV_FILE;
        break;
      default:
        throw new BadRequestException('Unsupported mimetype');
    }

    return this.createAndQueueSubmission(userId, sourceType, filename ?? null, parsedText);
  }

  private async createAndQueueSubmission(
    userId: string,
    sourceType: string,
    sourceName: string | null,
    rawContent: string,
  ): Promise<SubmissionAcceptedResponse> {
    const request = await this.processingRequestsRepository.create({
      userId,
      sourceType,
      sourceName,
      rawContent,
      statusCode: PROCESSING_REQUEST_STATUS_QUEUED,
    });

    const transaction = await this.transactionsRepository.createPending({
      userId,
      walletId: BOOTSTRAP_SPENDING_WALLET_ID,
      processingRequestId: request.id,
      currency: DEFAULT_CURRENCY,
      rawContent,
      statusCode: TRANSACTION_STATUS_PENDING,
    });

    await this.transactionsQueue.add('transaction', {
      requestId: request.id,
      transactionId: transaction.id,
    });

    return {
      requestId: request.id,
      statusCode: request.statusCode,
    };
  }
}
