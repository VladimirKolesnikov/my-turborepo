import { Injectable } from '@nestjs/common';
import { sql } from '@repo/database';
import {
  users,
  wallets,
  walletTypes,
  transactionStatuses,
  transactions,
} from '@repo/database';
import { DatabaseService } from '../database/database.service';
import { AiProcessorService, ProcessedTransactionResult } from '../ai-processor/ai-processor.service';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
const MOCK_WALLET_ID = '00000000-0000-0000-0000-000000000002';

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

    // Ensure lookup table rows exist
    await db
      .insert(walletTypes)
      .values({ code: 'personal', label: 'Personal' })
      .onConflictDoNothing();

    await db
      .insert(transactionStatuses)
      .values([
        { code: 'pending', label: 'Pending' },
        { code: 'pending_confirmation', label: 'Pending Confirmation' },
        { code: 'confirmed', label: 'Confirmed' },
      ])
      .onConflictDoNothing();

    // Ensure mock user exists
    await db
      .insert(users)
      .values({
        id: MOCK_USER_ID,
        username: 'test_user',
        email: 'test@neoxi.local',
        passwordHash: 'not-a-real-hash',
      })
      .onConflictDoNothing();

    // Ensure mock wallet exists
    await db
      .insert(wallets)
      .values({
        id: MOCK_WALLET_ID,
        userId: MOCK_USER_ID,
        name: 'Test Wallet',
        balance: '10000',
        currency: 'USD',
        typeCode: 'personal',
      })
      .onConflictDoNothing();

    const randomMessage = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]!;
    const message: string = rawContent ?? randomMessage;

    // Create a fresh transaction for this test run
    const rows = await db
      .insert(transactions)
      .values({
        userId: MOCK_USER_ID,
        walletId: MOCK_WALLET_ID,
        amount: '0',
        currency: 'USD',
        rawContent: message,
        statusCode: 'pending',
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
      .where(sql`user_id = ${MOCK_USER_ID}`)
      .orderBy(sql`created_at DESC`)
      .limit(10);
  }
}
