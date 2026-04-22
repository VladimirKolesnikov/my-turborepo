import { createDatabase } from "./index";
import * as schema from "./schema";
import * as dotenv from "dotenv";
import { expand } from "dotenv-expand";
import * as path from "path";

async function main() {
  console.log("-------------------- Seed started... --------------------");

  const env = dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
  expand(env);

  const db = createDatabase();

  console.log("Inserting test user...");

  await db.insert(schema.users).values({
    id: "00000000-0000-0000-0000-000000000001",
    username: "Test User",
    email: "test@example.com",
    passwordHash: "password_hash",
  }).onConflictDoUpdate({
    target: schema.users.id,
    set: {
      username: "Test User",
      email: "test@example.com",
    }
  });

  console.log("Inserting wallet types...");

  await db.insert(schema.walletTypes).values([
    { code: "bank", label: "Monobank" },]).onConflictDoNothing();

  console.log("Inserting transaction statuses...");

  await db.insert(schema.transactionStatuses).values([
    { code: "pending", label: "Pending" },
    { code: "waiting", label: "Waiting" },
    { code: "active", label: "Active" },
    { code: "completed", label: "Completed" },
    { code: "failed", label: "Failed" },
  ]).onConflictDoNothing();

  console.log("Inserting test wallet...");

  await db.insert(schema.wallets).values({
    id: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000001",
    name: "Test Wallet",
    typeCode: "bank",
    currency: "USD",
    balance: "0",
  }).onConflictDoUpdate({
    target: schema.wallets.id,
    set: {
      name: "Test Wallet",
      typeCode: "bank",
      currency: "USD",
    }
  });

  console.log("------------------- Seed finished! -------------------");
}

main()
  .catch((err) => {
    console.error("Seed failed!");
    console.error(err);
  })
  .finally(() => {
    console.log("-------------------- Seed finished successfully! --------------------");
  });
