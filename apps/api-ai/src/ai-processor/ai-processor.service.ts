import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  eq,
  sql,
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

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly llmService: LlmService,
  ) {}

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
        await db
          .update(transactions)
          .set({
            amount: String(event.amount),
            statusCode: TRANSACTION_STATUS_PENDING_CONFIRMATION,
          })
          .where(eq(transactions.id, transactionId));

        this.logger.log(`[step 6.${i}] updated existing transaction ${transactionId}: amount=${event.amount} category=${event.category}`);
        eventTransactionIds.push(transactionId);
      } else {
        const [newTx] = await db
          .insert(transactions)
          .values({
            userId: transaction.userId,
            walletId: transaction.walletId,
            amount: String(event.amount),
            currency: transaction.currency,
            rawContent: transaction.rawContent,
            statusCode: TRANSACTION_STATUS_PENDING_CONFIRMATION,
          })
          .returning({ id: transactions.id });

        if (!newTx) throw new Error(`Failed to insert transaction for event ${i}`);
        this.logger.log(`[step 6.${i}] inserted new transaction ${newTx.id}: amount=${event.amount} category=${event.category}`);
        eventTransactionIds.push(newTx.id);
      }
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
