import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CATEGORY_TYPE_EXPENSE,
  CATEGORY_TYPE_INCOME,
  eq,
  PROCESSING_REQUEST_STATUS_PROCESSING,
  PROCESSING_REQUEST_STATUS_REVIEW_READY,
  ProcessingRequestsRepository,
  REVIEW_DECISION_PENDING,
  sql,
  TransactionReviewsRepository,
  TransactionsRepository,
  transactions,
  transactionEmbeddings,
  wallets,
  users,
  TRANSACTION_STATUS_PENDING_CONFIRMATION,
} from '@repo/database';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';

export interface FinancialEventResult {
  transactionId: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryName: string;
  confidence: number;
}

export interface ProcessedTransactionResult {
  walletBalanceAfter: number;
  totalIncome: number;
  totalExpenses: number;
  categories: Record<string, number>;
  events: FinancialEventResult[];
}

@Injectable()
export class AiProcessorService {
  private readonly logger = new Logger(AiProcessorService.name);
  private readonly processingRequestsRepository: ProcessingRequestsRepository;
  private readonly transactionsRepository: TransactionsRepository;
  private readonly transactionReviewsRepository: TransactionReviewsRepository;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly llmService: LlmService,
  ) {
    this.processingRequestsRepository = new ProcessingRequestsRepository(
      databaseService.db,
    );
    this.transactionsRepository = new TransactionsRepository(databaseService.db);
    this.transactionReviewsRepository = new TransactionReviewsRepository(
      databaseService.db,
    );
  }

  async process(transactionId: string): Promise<ProcessedTransactionResult> {
    this.logger.log(`Processing transaction ${transactionId}`);

    const db = this.databaseService.db;

    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (transaction.processingRequestId) {
      await this.processingRequestsRepository.updateStatus(
        transaction.processingRequestId,
        PROCESSING_REQUEST_STATUS_PROCESSING,
      );
    }

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, transaction.walletId));

    if (!wallet) {
      throw new NotFoundException(`Wallet ${transaction.walletId} not found`);
    }

    this.logger.log(`[step 1] wallet balance from DB: ${wallet.balance} ${wallet.currency}`);

    // Filter out non-financial content — keep only financial sentences for embedding + parsing
    const cleanedText = await this.llmService.cleanUserMessage(transaction.rawContent);
    this.logger.log(`[step 2] cleaned text: "${cleanedText}"`);

    const embedding = await this.llmService.generateEmbedding(cleanedText);
    this.logger.log(`[step 3] embedding generated (${embedding.length} dims)`);

    const ragContext = await db
      .select({
        content: transactionEmbeddings.content,
        confirmedCategoryName: transactionEmbeddings.confirmedCategoryName,
      })
      .from(transactionEmbeddings)
      .where(eq(transactionEmbeddings.userId, transaction.userId))
      .orderBy(sql`embedding <=> ${JSON.stringify(embedding)}::vector`)
      .limit(5);

    this.logger.log(`[step 4] RAG context (${ragContext.length} items): ${JSON.stringify(ragContext)}`);

    const parsed = await this.llmService.parseFinancialMessage(
      cleanedText,
      wallet.balance ?? '0',
      wallet.currency,
      ragContext,
    );

    this.logger.log(
      `[step 5] LLM parsed result: wallet_after=${parsed.wallet_balance_after} income=${parsed.total_income} expenses=${parsed.total_expenses} events=${parsed.events.length}`,
    );
    this.logger.log(`[step 5] events: ${JSON.stringify(parsed.events)}`);

    // First event reuses the pre-existing transaction row; subsequent events get new rows
    const eventTransactionIds: string[] = [];

    for (let i = 0; i < parsed.events.length; i++) {
      const event = parsed.events[i]!;

      if (i === 0) {
        await this.transactionsRepository.updateProcessed(transactionId, {
          amount: String(event.amount),
          typeCode:
            event.type === 'income' ? CATEGORY_TYPE_INCOME : CATEGORY_TYPE_EXPENSE,
          statusCode: TRANSACTION_STATUS_PENDING_CONFIRMATION,
        });

        this.logger.log(`[step 6.${i}] updated existing transaction ${transactionId}: amount=${event.amount} category=${event.category}`);
        eventTransactionIds.push(transactionId);
      } else {
        const newTx = await this.transactionsRepository.createPending({
          userId: transaction.userId,
          walletId: transaction.walletId,
          processingRequestId: transaction.processingRequestId,
          amount: String(event.amount),
          currency: transaction.currency,
          rawContent: transaction.rawContent,
          statusCode: TRANSACTION_STATUS_PENDING_CONFIRMATION,
        });
        await this.transactionsRepository.updateProcessed(newTx.id, {
          amount: String(event.amount),
          typeCode:
            event.type === 'income' ? CATEGORY_TYPE_INCOME : CATEGORY_TYPE_EXPENSE,
          statusCode: TRANSACTION_STATUS_PENDING_CONFIRMATION,
        });

        this.logger.log(`[step 6.${i}] inserted new transaction ${newTx.id}: amount=${event.amount} category=${event.category}`);
        eventTransactionIds.push(newTx.id);
      }

      await this.transactionReviewsRepository.upsertProposal({
        transactionId: eventTransactionIds[i]!,
        proposedCategoryName: event.category,
        proposedDescription: event.description,
        confidence: String(event.confidence),
        decisionStatus: REVIEW_DECISION_PENDING,
      });
    }

    await db
      .update(wallets)
      .set({ balance: String(parsed.wallet_balance_after) })
      .where(eq(wallets.id, transaction.walletId));

    this.logger.log(`[step 7] wallet ${wallet.id} balance updated: ${wallet.balance} → ${parsed.wallet_balance_after}`);

    await db
      .update(users)
      .set({
        totalSpendings: sql`total_spendings + ${String(parsed.total_expenses)}::numeric`,
        totalIncome: sql`total_income + ${String(parsed.total_income)}::numeric`,
      })
      .where(eq(users.id, transaction.userId));

    this.logger.log(`[step 8] user totals updated: +income=${parsed.total_income} +expenses=${parsed.total_expenses}`);

    const categories: Record<string, number> = {};
    for (const event of parsed.events) {
      categories[event.category] = (categories[event.category] ?? 0) + event.amount;
    }

    this.logger.log(
      `[done] transaction ${transactionId} — ${parsed.events.length} event(s), wallet: ${parsed.wallet_balance_after}, categories: ${JSON.stringify(categories)}`,
    );

    if (transaction.processingRequestId) {
      await this.processingRequestsRepository.updateStatus(
        transaction.processingRequestId,
        PROCESSING_REQUEST_STATUS_REVIEW_READY,
      );
    }

    return {
      walletBalanceAfter: parsed.wallet_balance_after,
      totalIncome: parsed.total_income,
      totalExpenses: parsed.total_expenses,
      categories,
      events: parsed.events.map((event, i) => ({
        transactionId: eventTransactionIds[i]!,
        description: event.description,
        amount: event.amount,
        type: event.type,
        categoryName: event.category,
        confidence: event.confidence,
      })),
    };
  }
}
