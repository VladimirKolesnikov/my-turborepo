import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TestService } from './test.service';

interface RunWithMessageBody {
  message?: string;
}

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  /**
   * Seed a mock transaction with a random (or custom) message and run the full AI pipeline.
   *
   * POST /test/run
   * Body (optional): { "message": "Spent $50 on dinner and $20 on a taxi" }
   */
  @Post('run')
  run(@Body() body: RunWithMessageBody) {
    return this.testService.seedAndProcess(body?.message);
  }

  /**
   * Run the AI pipeline on an existing transaction by ID.
   *
   * POST /test/run/:transactionId
   */
  @Post('run/:transactionId')
  runExisting(@Param('transactionId') transactionId: string) {
    return this.testService.processExisting(transactionId);
  }

  /**
   * List the 10 most recent mock transactions with their processing status.
   *
   * GET /test/transactions
   */
  @Get('transactions')
  recentTransactions() {
    return this.testService.getRecentTransactions();
  }
}
