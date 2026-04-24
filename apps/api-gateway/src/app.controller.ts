import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileProcessorService } from './gateway/file-processor/file-processor.service';

const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001';

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
      TEMP_USER_ID,
      file.mimetype,
      file.buffer,
    );

    return result;
  }
}
