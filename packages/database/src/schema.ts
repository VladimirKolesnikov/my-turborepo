import {
  boolean,
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
  isActivated: boolean("is_activated").default(false).notNull(),
  activationLink: uuid("activation_link").defaultRandom(),
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

export const refreshTokens = pgTable("refresh_tokens", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
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

export const processingRequests = pgTable("processing_requests", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceName: varchar("source_name", { length: 255 }),
  rawContent: text("raw_content").notNull(),
  statusCode: varchar("status_code", { length: 50 }).notNull(),
  errorMessage: text("error_message"),
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
  processingRequestId: uuid("processing_request_id").references(
    () => processingRequests.id,
    {
      onDelete: "set null",
    },
  ),
  amount: numeric("amount", {
    precision: 14,
    scale: 2,
  }),
  typeCode: varchar("type_code", { length: 50 }).references(() => categoryTypes.code),
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

export const transactionReviews = pgTable(
  "transaction_reviews",
  {
    id: id(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, {
        onDelete: "cascade",
      }),
    proposedCategoryName: varchar("proposed_category_name", {
      length: 255,
    }).notNull(),
    proposedDescription: text("proposed_description").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
    finalCategoryName: varchar("final_category_name", {
      length: 255,
    }),
    finalDescription: text("final_description"),
    decisionStatus: varchar("decision_status", { length: 50 }).notNull(),
    ...timestamps(),
  },
  (table) => ({
    transactionIdIdx: uniqueIndex("transaction_reviews_transaction_id_uidx").on(
      table.transactionId,
    ),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  categories: many(categories),
  processingRequests: many(processingRequests),
  transactions: many(transactions),
  embeddings: many(transactionEmbeddings),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
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

export const processingRequestsRelations = relations(
  processingRequests,
  ({ one, many }) => ({
    user: one(users, {
      fields: [processingRequests.userId],
      references: [users.id],
    }),
    transactions: many(transactions),
  }),
);

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

  processingRequest: one(processingRequests, {
    fields: [transactions.processingRequestId],
    references: [processingRequests.id],
  }),

  embedding: one(transactionEmbeddings, {
    fields: [transactions.id],
    references: [transactionEmbeddings.transactionId],
  }),

  review: one(transactionReviews, {
    fields: [transactions.id],
    references: [transactionReviews.transactionId],
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

export const transactionReviewsRelations = relations(
  transactionReviews,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionReviews.transactionId],
      references: [transactions.id],
    }),
  }),
);
