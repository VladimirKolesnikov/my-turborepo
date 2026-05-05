import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { FileProcessorModule } from './gateway/file-processor/file-processor.module';
import { ConfirmationModule } from './gateway/confirmation/confirmation.module';
import { WorkspaceModule } from './gateway/workspace/workspace.module';

@Module({
  imports: [FileProcessorModule, ConfirmationModule, WorkspaceModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }
