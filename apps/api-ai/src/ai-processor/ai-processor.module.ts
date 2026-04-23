import { Module } from '@nestjs/common';
import { AiProcessorService } from './ai-processor.service';
import { DatabaseModule } from '../database/database.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [DatabaseModule, LlmModule],
  providers: [AiProcessorService],
  exports: [AiProcessorService],
})
export class AiProcessorModule {}
