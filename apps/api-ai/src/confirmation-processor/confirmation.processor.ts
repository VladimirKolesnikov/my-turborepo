import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq, transactions, transactionEmbeddings } from '@repo/database';
import { TRANSACTION_CONFIRMATION_QUEUE } from '@repo/constants';
import { LlmService } from '../llm/llm.service';
import { DatabaseService } from '../database/database.service';

interface ConfirmJobData {
  transactionId: string;
  confirmedCategoryName: string;
  content: string;
}

@Processor(TRANSACTION_CONFIRMATION_QUEUE)
export class ConfirmationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConfirmationProcessor.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly databaseService: DatabaseService,
  ) {
    super();
  }

  async process(job: Job<ConfirmJobData>): Promise<void> {
    const { transactionId, confirmedCategoryName, content } = job.data;
    this.logger.log(`Embedding job ${job.id} — transaction ${transactionId}, category: ${confirmedCategoryName}`);

    const db = this.databaseService.db;

    const [transaction] = await db
      .select({ userId: transactions.userId })
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const embedding = await this.llmService.generateEmbedding(content);

    await db
      .insert(transactionEmbeddings)
      .values({
        userId: transaction.userId,
        transactionId,
        content,
        embedding,
        confirmedCategoryName,
      })
      .onConflictDoUpdate({
        target: transactionEmbeddings.transactionId,
        set: { content, embedding, confirmedCategoryName },
      });

    this.logger.log(`Embedding stored for transaction ${transactionId}`);
  }
}
