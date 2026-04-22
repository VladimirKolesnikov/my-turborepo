import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';
import { transactions } from '@repo/database';
import { DATABASE_CONNECTION } from '../database/database.constants';

// const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEMP_WALLET_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class FileProcessorService {
  constructor(
    private readonly txtStrategy: TxtParserStrategy,
    @Inject(DATABASE_CONNECTION)
    private readonly db,
  ) { }

  async processFile(userId: string, mimetype: string, buffer: Buffer): Promise<{ raw_content: string }> {
    let parsedText: string;

    switch (mimetype) {
      case 'text/plain':
        parsedText = await this.txtStrategy.parse(buffer);
        break;
      default:
        throw new BadRequestException('Unsupported mimetype');
    }

    const resultObject = { raw_content: parsedText };

    await this.db.insert(transactions).values({
      userId,
      walletId: TEMP_WALLET_ID,
      amount: '0',
      rawContent: parsedText,
    });

    return resultObject;
  }
}
