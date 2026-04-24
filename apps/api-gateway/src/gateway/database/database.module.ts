import { Module } from '@nestjs/common';
import { createDatabase } from '@repo/database';
import { DATABASE_CONNECTION } from './database.constants';

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: () => {
        return createDatabase();
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
