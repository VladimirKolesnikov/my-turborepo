import { Module } from '@nestjs/common';
import { FileProcessorService } from './file-processor.service';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FileProcessorService, TxtParserStrategy],
  exports: [FileProcessorService],
})
export class FileProcessorModule {}
