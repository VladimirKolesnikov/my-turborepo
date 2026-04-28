import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConfig } from '@repo/redis';
import { TRANSACTION_CONFIRMATION_QUEUE } from '@repo/constants';
import { TRANSACTIONS_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConfig(),
    }),
    BullModule.registerQueue(
      { name: TRANSACTIONS_QUEUE },
      { name: TRANSACTION_CONFIRMATION_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
