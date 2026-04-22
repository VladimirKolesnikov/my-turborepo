import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { FileProcessorModule } from './gateway/file-processor/file-processor.module';

@Module({
  imports: [FileProcessorModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }
