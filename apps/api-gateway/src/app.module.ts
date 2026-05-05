import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { FileProcessorModule } from './gateway/file-processor/file-processor.module';
import { ConfirmationModule } from './gateway/confirmation/confirmation.module';
import { WorkspaceModule } from './gateway/workspace/workspace.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FileProcessorModule,
    ConfirmationModule,
    WorkspaceModule,
    AuthModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }
