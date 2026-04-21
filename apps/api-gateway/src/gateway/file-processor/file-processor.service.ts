import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';
import { createDatabase, parsedFiles } from '@repo/database';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  private db;

  constructor(private readonly txtStrategy: TxtParserStrategy) {}

  onModuleInit() {
    this.db = createDatabase();
  }

  async processFile(userId: string, mimetype: string, buffer: Buffer): Promise<any> {
    let parsedText: string;

    switch (mimetype) {
      case 'text/plain':
        parsedText = await this.txtStrategy.parse(buffer);
        break;
      default:
        throw new BadRequestException('Unsupported mimetype');
    }

    const resultObject = { message: parsedText };

    await this.db.insert(parsedFiles).values({
      userId,
      content: resultObject,
    });

    return resultObject;
  }
}
