import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  PROCESSING_REQUEST_STATUS_FAILED,
  ProcessingRequestsRepository,
} from '@repo/database';
import { AiProcessorService, ProcessedTransactionResult } from '../ai-processor/ai-processor.service';
import { TRANSACTION_PROCESSING_QUEUE } from '@repo/constants';
import { DatabaseService } from '../database/database.service';

export interface ProcessTransactionJobData {
  requestId?: string;
  transactionId: string;
}

@Processor(TRANSACTION_PROCESSING_QUEUE, { concurrency: 10 })
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);
  private readonly processingRequestsRepository: ProcessingRequestsRepository;

  constructor(
    private readonly aiProcessorService: AiProcessorService,
    private readonly databaseService: DatabaseService,
  ) {
    super();
    this.processingRequestsRepository = new ProcessingRequestsRepository(
      databaseService.db,
    );
  }

  async process(job: Job<ProcessTransactionJobData>): Promise<ProcessedTransactionResult> {
    const { requestId, transactionId } = job.data;
    this.logger.log(`Received job ${job.id} for transaction ${transactionId}`);

    try {
      const result = await this.aiProcessorService.process(transactionId);
      this.logger.log(`Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      if (requestId) {
        await this.processingRequestsRepository.updateStatus(
          requestId,
          PROCESSING_REQUEST_STATUS_FAILED,
          (error as Error).message,
        );
      }
      this.logger.error(`Job ${job.id} failed: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
