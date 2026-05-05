import { and, eq, ilike } from "drizzle-orm";
import type { databaseType } from "../index";
import { categories } from "../schema";
import { CATEGORY_TYPE_EXPENSE } from "../bootstrap";

export class CategoriesRepository {
  constructor(private readonly db: databaseType) {}

  async findByUserAndName(userId: string, name: string) {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), ilike(categories.name, name)));

    return row ?? null;
  }

  async createForUser(userId: string, name: string, categoryType = CATEGORY_TYPE_EXPENSE) {
    const [row] = await this.db
      .insert(categories)
      .values({
        userId,
        name,
        typeCode: categoryType,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create category");
    }

    return row;
  }
}
