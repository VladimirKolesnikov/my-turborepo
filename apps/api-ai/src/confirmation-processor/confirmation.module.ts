import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TRANSACTION_CONFIRMATION_QUEUE } from '@repo/constants';
import { ConfirmationProcessor } from './confirmation.processor';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: TRANSACTION_CONFIRMATION_QUEUE }),
    LlmModule,
  ],
  providers: [ConfirmationProcessor],
})
export class ConfirmationModule {}
