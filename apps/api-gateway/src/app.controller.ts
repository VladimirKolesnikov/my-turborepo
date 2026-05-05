import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BOOTSTRAP_USER_ID } from '@repo/database';
import { FileProcessorService } from './gateway/file-processor/file-processor.service';

@Controller()
export class AppController {
  constructor(
    private readonly fileProcessorService: FileProcessorService,
  ) { }

  @Get('hello')
  hello() {
    return "Hello";
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {

    console.log('in upload-1');
    console.log(file);
    console.log('in upload-2');

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.fileProcessorService.processFile(
      BOOTSTRAP_USER_ID,
      file.mimetype,
      file.buffer,
      file.originalname,
    );

    return result;
  }
}
