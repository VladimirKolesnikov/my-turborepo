import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileProcessorService } from '../file-processor/file-processor.service';

@Controller('upload')
export class FileUploaderController {
  constructor(private readonly fileProcessorService: FileProcessorService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('in uploadFile')
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = 'user-123'; // temporary hardcoded value

    const result = await this.fileProcessorService.processFile(
      userId,
      file.mimetype,
      file.buffer,
    );

    return result;
  }
}
