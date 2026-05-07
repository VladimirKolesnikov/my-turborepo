import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import { expand } from "dotenv-expand";
import * as path from "path";

const env = dotenv.config({ path: path.resolve(__dirname, "../../.env") });
expand(env);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('Missing memory url');

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
