import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConfig } from '@repo/redis';

@Module({
  imports: [
    BullModule.forRoot({ connection: getRedisConfig()})
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
