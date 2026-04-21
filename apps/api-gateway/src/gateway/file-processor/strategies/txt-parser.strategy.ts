import { Injectable } from '@nestjs/common';
import { FileParserStrategy } from './file-parser.strategy';

@Injectable()
export class TxtParserStrategy implements FileParserStrategy {
  async parse(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }
}
