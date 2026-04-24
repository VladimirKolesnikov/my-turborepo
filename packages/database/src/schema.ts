import {
  index,
  numeric,
  pgTable,
  timestamp,
  text,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () => uuid("id").defaultRandom().primaryKey();

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export const walletTypes = pgTable("wallet_types", {
  code: varchar("code", { length: 50 }).primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
});

export const transactionStatuses = pgTable("transaction_statuses", {
  code: varchar("code", { length: 50 }).primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
});

export const categoryTypes = pgTable("category_types", {
  code: varchar("code", { length: 50 }).primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
});

export const users = pgTable("users", {
  id: id(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash"),
  totalSpendings: numeric("total_spendings", {
    precision: 14,
    scale: 2,
  }).default("0"),
  totalIncome: numeric("total_income", {
    precision: 14,
    scale: 2,
  }).default("0"),
  ...timestamps(),
});

export const wallets = pgTable("wallets", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  name: varchar("name", { length: 255 }).notNull(),
  balance: numeric("balance", {
    precision: 14,
    scale: 2,
  }).default("0"),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  typeCode: varchar("type_code", { length: 50 })
    .notNull()
    .references(() => walletTypes.code),
  ...timestamps(),
});

export const categories = pgTable("categories", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  typeCode: varchar("type_code", { length: 50 })
    .notNull()
    .references(() => categoryTypes.code),
  ...timestamps(),
});

export const transactions = pgTable("transactions", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id, {
      onDelete: "cascade",
    }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  amount: numeric("amount", {
    precision: 14,
    scale: 2,
  }),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  rawContent: text("raw_content").notNull(),
  statusCode: varchar("status_code", { length: 50 })
    .notNull()
    .default("pending")
    .references(() => transactionStatuses.code),
  ...timestamps(),
});

export const transactionEmbeddings = pgTable(
  "transaction_embeddings",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, {
        onDelete: "cascade",
      }),
    content: text("content").notNull(),
    embedding: vector("embedding", {
      dimensions: 1536,
    }),
    confirmedCategoryName: varchar("confirmed_category_name", {
      length: 255,
    }).notNull(),
    ...timestamps(),
  },
  (table) => ({
    userIdIdx: index("transaction_embeddings_user_id_idx").on(table.userId),
    transactionIdIdx: uniqueIndex("transaction_embeddings_transaction_id_uidx").on(
      table.transactionId,
    ),
    embeddingIdx: index("transaction_embedding_vector_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  categories: many(categories),
  transactions: many(transactions),
  embeddings: many(transactionEmbeddings),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),

  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),

  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),

  embedding: one(transactionEmbeddings, {
    fields: [transactions.id],
    references: [transactionEmbeddings.transactionId],
  }),
}));

export const embeddingsRelations = relations(
  transactionEmbeddings,
  ({ one }) => ({
    user: one(users, {
      fields: [transactionEmbeddings.userId],
      references: [users.id],
    }),

    transaction: one(transactions, {
      fields: [transactionEmbeddings.transactionId],
      references: [transactions.id],
    }),
  }),
);
