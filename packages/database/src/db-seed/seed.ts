import { createDatabase } from "../index";
import * as schema from "../schema";
import {
  BOOTSTRAP_INCOMING_WALLET_ID,
  BOOTSTRAP_SPENDING_WALLET_ID,
  BOOTSTRAP_USER_ID,
  CATEGORY_TYPE_EXPENSE,
  CATEGORY_TYPE_INCOME,
  DEFAULT_CURRENCY,
  TRANSACTION_STATUS_CONFIRMED,
  TRANSACTION_STATUS_FAILED,
  TRANSACTION_STATUS_PENDING,
  TRANSACTION_STATUS_PENDING_CONFIRMATION,
  WALLET_TYPE_INCOMING,
  WALLET_TYPE_SPENDING,
} from "../constants/bootstrap";
import * as dotenv from "dotenv";
import { expand } from "dotenv-expand";
import * as path from "path";

async function main() {
  console.log("-------------------- Seed started... --------------------");

  const env = dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
  expand(env);

  const db = createDatabase();

  console.log("Inserting wallet types...");

  await db
    .insert(schema.walletTypes)
    .values([
      { code: WALLET_TYPE_SPENDING, label: "Spending" },
      { code: WALLET_TYPE_INCOMING, label: "Incoming" },
    ])
    .onConflictDoNothing();

  console.log("Inserting transaction statuses...");

  await db
    .insert(schema.transactionStatuses)
    .values([
      { code: TRANSACTION_STATUS_PENDING, label: "Pending" },
      {
        code: TRANSACTION_STATUS_PENDING_CONFIRMATION,
        label: "Pending Confirmation",
      },
      { code: TRANSACTION_STATUS_CONFIRMED, label: "Confirmed" },
      { code: TRANSACTION_STATUS_FAILED, label: "Failed" },
    ])
    .onConflictDoNothing();

  console.log("Inserting category types...");

  await db
    .insert(schema.categoryTypes)
    .values([
      { code: CATEGORY_TYPE_EXPENSE, label: "Expense" },
      { code: CATEGORY_TYPE_INCOME, label: "Income" },
    ])
    .onConflictDoNothing();

  console.log("Inserting bootstrap user...");

  await db
    .insert(schema.users)
    .values({
      id: BOOTSTRAP_USER_ID,
      username: "bootstrap-user",
      email: "bootstrap@neoxi.local",
    })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        username: "bootstrap-user",
        email: "bootstrap@neoxi.local",
      },
    });

  console.log("Inserting bootstrap wallets...");

  await db
    .insert(schema.wallets)
    .values({
      id: BOOTSTRAP_SPENDING_WALLET_ID,
      userId: BOOTSTRAP_USER_ID,
      name: "Default Spending Wallet",
      typeCode: WALLET_TYPE_SPENDING,
      currency: DEFAULT_CURRENCY,
      balance: "0",
    })
    .onConflictDoUpdate({
      target: schema.wallets.id,
      set: {
        userId: BOOTSTRAP_USER_ID,
        name: "Default Spending Wallet",
        typeCode: WALLET_TYPE_SPENDING,
        currency: DEFAULT_CURRENCY,
        balance: "0",
      },
    });

  await db
    .insert(schema.wallets)
    .values({
      id: BOOTSTRAP_INCOMING_WALLET_ID,
      userId: BOOTSTRAP_USER_ID,
      name: "Default Incoming Wallet",
      typeCode: WALLET_TYPE_INCOMING,
      currency: DEFAULT_CURRENCY,
      balance: "0",
    })
    .onConflictDoUpdate({
      target: schema.wallets.id,
      set: {
        userId: BOOTSTRAP_USER_ID,
        name: "Default Incoming Wallet",
        typeCode: WALLET_TYPE_INCOMING,
        currency: DEFAULT_CURRENCY,
        balance: "0",
      },
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
