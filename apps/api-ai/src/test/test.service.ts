import { Injectable } from '@nestjs/common';
import {
  BOOTSTRAP_SPENDING_WALLET_ID,
  BOOTSTRAP_USER_ID,
  DEFAULT_CURRENCY,
  TRANSACTION_STATUS_PENDING,
  transactions,
  sql,
} from '@repo/database';
import { DatabaseService } from '../database/database.service';
import { AiProcessorService, ProcessedTransactionResult } from '../ai-processor/ai-processor.service';

const MOCK_MESSAGES = [
  "Today I went for a walk with my dog. Later met friends at a bar and spent $100 there.",
  "Bought groceries at the supermarket for $45.50. Also grabbed a coffee for $4.",
  "Got my salary deposited — $3200. Then paid $800 for rent.",
  "Had a great birthday party! Friends paid for my dinner. Later I took an Uber for $18.",
  "Went to the gym, monthly membership cost me $35. Bought a protein shake for $8.",
];

@Injectable()
export class TestService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly aiProcessorService: AiProcessorService,
  ) {}

  async seedAndProcess(rawContent?: string): Promise<ProcessedTransactionResult> {
    const db = this.databaseService.db;

    const randomMessage = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]!;
    const message: string = rawContent ?? randomMessage;

    // Create a fresh transaction for this test run
    const rows = await db
      .insert(transactions)
      .values({
        userId: BOOTSTRAP_USER_ID,
        walletId: BOOTSTRAP_SPENDING_WALLET_ID,
        amount: '0',
        currency: DEFAULT_CURRENCY,
        rawContent: message,
        statusCode: TRANSACTION_STATUS_PENDING,
      })
      .returning({ id: transactions.id });

    const transactionId = rows[0]?.id;
    if (!transactionId) {
      throw new Error('Failed to insert mock transaction');
    }

    return this.aiProcessorService.process(transactionId);
  }

  async processExisting(transactionId: string): Promise<ProcessedTransactionResult> {
    return this.aiProcessorService.process(transactionId);
  }

  async getRecentTransactions() {
    return this.databaseService.db
      .select({
        id: transactions.id,
        rawContent: transactions.rawContent,
        statusCode: transactions.statusCode,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(sql`user_id = ${BOOTSTRAP_USER_ID}`)
      .orderBy(sql`created_at DESC`)
      .limit(10);
  }
}
