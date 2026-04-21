import { Module } from '@nestjs/common';
import { FileProcessorService } from './file-processor.service';
import { TxtParserStrategy } from './strategies/txt-parser.strategy';

@Module({
  providers: [FileProcessorService, TxtParserStrategy],
  exports: [FileProcessorService],
})
export class FileProcessorModule {}
