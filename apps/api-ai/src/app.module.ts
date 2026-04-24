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

@Module({
  imports: [
    BullModule.forRoot({ connection: getRedisConfig() }),
    DatabaseModule,
    LlmModule,
    AiProcessorModule,
    QueueModule,
    TestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
