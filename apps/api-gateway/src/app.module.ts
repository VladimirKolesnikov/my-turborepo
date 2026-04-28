import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { FileProcessorModule } from './gateway/file-processor/file-processor.module';
import { ConfirmationModule } from './gateway/confirmation/confirmation.module';

@Module({
  imports: [FileProcessorModule, ConfirmationModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }
