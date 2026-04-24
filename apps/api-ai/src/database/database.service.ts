import { Injectable } from '@nestjs/common';
import { createDatabase, type databaseType } from '@repo/database';


@Injectable()
export class DatabaseService {
  public readonly db: databaseType;

  constructor() {
    this.db = createDatabase();
  }
}
