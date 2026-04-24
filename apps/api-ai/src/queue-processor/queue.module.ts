import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueProcessor, TRANSACTION_PROCESSING_QUEUE } from './queue.processor';
import { AiProcessorModule } from '../ai-processor/ai-processor.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TRANSACTION_PROCESSING_QUEUE,
    }),
    AiProcessorModule,
  ],
  providers: [QueueProcessor],
})
export class QueueModule {}
