import { Module } from '@nestjs/common';
import { AiProcessorService } from './ai-processor.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AiProcessorService]
})
export class AiProcessorModule {}
