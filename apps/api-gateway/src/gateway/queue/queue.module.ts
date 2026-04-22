import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConfig } from '@repo/redis';
import { TRANSACTIONS_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConfig(),
    }),
    BullModule.registerQueue({
      name: TRANSACTIONS_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
