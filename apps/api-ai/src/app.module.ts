import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConfig } from '@repo/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiProcessorModule } from './ai-processor/ai-processor.module';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue-processor/queue.module';
import { LlmModule } from './llm/llm.module';
import { TestModule } from './test/test.module';
import { ConfirmationModule } from './confirmation-processor/confirmation.module';

@Module({
  imports: [
    BullModule.forRoot({ connection: getRedisConfig() }),
    DatabaseModule,
    LlmModule,
    AiProcessorModule,
    QueueModule,
    ConfirmationModule,
    TestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
