import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiProcessorService, ProcessedTransactionResult } from '../ai-processor/ai-processor.service';

// NOTE: The api-gateway producer must publish jobs to the same queue name.
export const TRANSACTION_PROCESSING_QUEUE = 'transaction-processing';

export interface ProcessTransactionJobData {
  transactionId: string;
}

@Processor(TRANSACTION_PROCESSING_QUEUE, { concurrency: 10 })
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(private readonly aiProcessorService: AiProcessorService) {
    super();
  }

  async process(job: Job<ProcessTransactionJobData>): Promise<ProcessedTransactionResult> {
    const { transactionId } = job.data;
    this.logger.log(`Received job ${job.id} for transaction ${transactionId}`);

    try {
      const result = await this.aiProcessorService.process(transactionId);
      this.logger.log(`Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
