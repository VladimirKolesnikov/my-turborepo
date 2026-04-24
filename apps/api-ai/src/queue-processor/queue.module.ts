import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueProcessor } from './queue.processor';
import { TRANSACTION_PROCESSING_QUEUE } from '@repo/constants';
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
