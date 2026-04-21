import { Module } from '@nestjs/common';
import { FileUploaderController } from './file-uploader.controller';
import { FileProcessorModule } from '../file-processor/file-processor.module';

@Module({
  imports: [FileProcessorModule],
  controllers: [FileUploaderController],
})
export class FileUploaderModule {}
