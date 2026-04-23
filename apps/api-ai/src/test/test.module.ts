import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { AiProcessorModule } from '../ai-processor/ai-processor.module';

@Module({
  imports: [AiProcessorModule],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}
