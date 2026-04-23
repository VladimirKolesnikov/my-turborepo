import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { eq } from 'drizzle-orm';
import { transactions } from '@repo/database';

@Injectable()
export class AiProcessorService {

  constructor(private databaseService: DatabaseService) {}

  public async process(transactionId: string) {

    const [transaction] = await this.databaseService.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    const embeddig = this.cleanUserMessage(transaction.rawContent);


  }

  private async cleanUserMessage(rawText: string): Promise<string> {
    return 'Message'
  }

}
