import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessageEvent } from '@nestjs/common';
import { interval, Observable } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { BOOTSTRAP_USER_ID } from '@repo/database';
import { FileProcessorService } from '../file-processor/file-processor.service';
import { WorkspaceService } from './workspace.service';

interface SubmitTextBody {
  text: string;
}

@Controller()
export class WorkspaceController {
  constructor(
    private readonly fileProcessorService: FileProcessorService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Post('transactions/text')
  submitText(@Body() body: SubmitTextBody) {
    if (!body?.text?.trim()) {
      throw new BadRequestException('Request body must include a non-empty "text" field');
    }

    return this.fileProcessorService.processText(BOOTSTRAP_USER_ID, body.text);
  }

  @Post('transactions/upload')
  @UseInterceptors(FileInterceptor('file'))
  submitFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.fileProcessorService.processFile(
      BOOTSTRAP_USER_ID,
      file.mimetype,
      file.buffer,
      file.originalname,
    );
  }

  @Get('processing-requests/:requestId')
  getProcessingRequest(@Param('requestId') requestId: string) {
    return this.workspaceService.getProcessingRequestDetail(requestId);
  }

  @Sse('processing-requests/:requestId/events')
  watchProcessingRequest(
    @Param('requestId') requestId: string,
  ): Observable<MessageEvent> {
    return interval(1000).pipe(
      switchMap(() => this.workspaceService.getProcessingRequestDetail(requestId)),
      map((payload) => JSON.stringify(payload)),
      distinctUntilChanged(),
      map((payload) => ({
        data: payload,
      })),
    );
  }

  @Get('transactions/review-queue')
  reviewQueue() {
    return this.workspaceService.listPendingReviews(BOOTSTRAP_USER_ID);
  }

  @Get('transactions/recent')
  recent() {
    return this.workspaceService.listRecentTransactions(BOOTSTRAP_USER_ID);
  }
}
