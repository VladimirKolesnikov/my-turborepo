import { Controller, Post, Param, Body } from '@nestjs/common';
import { ConfirmationService, ConfirmTransactionDto } from './confirmation.service';

@Controller('transactions')
export class ConfirmationController {
  constructor(private readonly confirmationService: ConfirmationService) {}

  @Post(':transactionId/confirm')
  confirm(
    @Param('transactionId') transactionId: string,
    @Body() body: ConfirmTransactionDto,
  ) {
    return this.confirmationService.confirm(transactionId, body);
  }
}
