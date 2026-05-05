import { eq } from "drizzle-orm";
import type { databaseType } from "../index";
import { users } from "../schema";

export class UsersRepository {
  constructor(private readonly db: databaseType) {}

  async create(input: {
    username: string;
    email: string;
    passwordHash: string;
    activationLink: string;
  }) {
    const [row] = await this.db
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        activationLink: input.activationLink,
      })
      .returning();

    if (!row) throw new Error("Failed to create user");
    return row;
  }

  async findByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return row ?? null;
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return row ?? null;
  }

  async findByActivationLink(link: string) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.activationLink, link));
    return row ?? null;
  }

  async activate(userId: string) {
    await this.db
      .update(users)
      .set({ isActivated: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
