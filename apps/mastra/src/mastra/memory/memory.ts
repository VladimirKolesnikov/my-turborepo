import { PostgresStore } from "@mastra/pg";
import { Memory } from "@mastra/memory";

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
  schema: "mastraMemory",
});

export const sharedMemory = new Memory({
  storage,
  options: {
    observationalMemory: true,
    generateTitle: true,
  },
});
