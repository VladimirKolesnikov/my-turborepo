import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  eq,
  sql,
  transactions,
  transactionEmbeddings,
  TRANSACTION_STATUS_PENDING_CONFIRMATION,
} from '@repo/database';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';

export interface ProcessedTransactionResult {
  transactionId: string;
  categoryName: string;
  cleanedDescription: string;
  amount: string;
  currency: string | null;
  confidence: number;
}

@Injectable()
export class AiProcessorService {
  private readonly logger = new Logger(AiProcessorService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly llmService: LlmService,
  ) {}

  async process(transactionId: string): Promise<ProcessedTransactionResult> {
    this.logger.log(`Processing transaction ${transactionId}`);

    // 1. Fetch transaction
    const [transaction] = await this.databaseService.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    // 2. Extract only financial content from raw user message
    const cleanedText = await this.llmService.cleanUserMessage(transaction.rawContent);
    this.logger.debug(`Cleaned message: "${cleanedText}"`);

    // 3. Generate embedding from cleaned text
    const embedding = await this.llmService.generateEmbedding(cleanedText);

    // 4. Vector similarity search for RAG context (confirmed/completed transactions)
    const ragContext = await this.databaseService.db
      .select({
        content: transactionEmbeddings.content,
        confirmedCategoryName: transactionEmbeddings.confirmedCategoryName,
      })
      .from(transactionEmbeddings)
      .where(eq(transactionEmbeddings.userId, transaction.userId))
      .orderBy(sql`embedding <=> ${JSON.stringify(embedding)}::vector`)
      .limit(5);

    this.logger.debug(`Found ${ragContext.length} RAG context items`);

    // 5. Categorize transaction using LLM with RAG context
    const categorized = await this.llmService.categorizeTransaction(cleanedText, ragContext);

    // 6. Mark transaction as pending_confirmation
    await this.databaseService.db
      .update(transactions)
      .set({ statusCode: TRANSACTION_STATUS_PENDING_CONFIRMATION })
      .where(eq(transactions.id, transactionId));

    this.logger.log(
      `Transaction ${transactionId} processed — category: "${categorized.categoryName}", confidence: ${categorized.confidence}`,
    );

    return {
      transactionId,
      categoryName: categorized.categoryName,
      cleanedDescription: categorized.description,
      amount: transaction.amount,
      currency: transaction.currency,
      confidence: categorized.confidence,
    };
  }
}
