import { Module } from '@nestjs/common';
import { FileProcessorService } from './file-processor.service';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';
import { CsvParserStrategy } from './strategies/csv-parser.strategy';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [FileProcessorService, TxtParserStrategy, CsvParserStrategy],
  exports: [FileProcessorService],
})
export class FileProcessorModule {}
