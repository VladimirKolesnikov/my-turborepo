import { eq } from "drizzle-orm";
import type { databaseType } from "../index";
import { refreshTokens } from "../schema";

export class RefreshTokensRepository {
  constructor(private readonly db: databaseType) {}

  async create(userId: string, tokenHash: string, expiresAt: Date) {
    const [row] = await this.db
      .insert(refreshTokens)
      .values({ userId, tokenHash, expiresAt })
      .returning();

    if (!row) throw new Error("Failed to save refresh token");
    return row;
  }

  async findByTokenHash(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    return row ?? null;
  }

  async deleteById(id: string) {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, id));
  }

  async deleteAllForUser(userId: string) {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }
}
