import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueProcessor } from './queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'queueProcessor',
    }),
  ],
  providers: [QueueProcessor],
})
export class QueueModule {}
