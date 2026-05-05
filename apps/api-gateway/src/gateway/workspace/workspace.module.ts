import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FileProcessorModule } from '../file-processor/file-processor.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [DatabaseModule, FileProcessorModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
