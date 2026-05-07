import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * from "drizzle-orm";
export * from "./constants/bootstrap";
export * from "./repositories";
export * from "./schema";
export type databaseType = PostgresJsDatabase<typeof schema>;

export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  // Accept DATABASE_URL only when it looks like a real URL.
  // dotenv does not interpolate shell variables, so a value like
  // "postgres://${POSTGRES_USER}:..." must be ignored.
  if (env.DATABASE_URL && !env.DATABASE_URL.includes("${")) {
    return env.DATABASE_URL;
  }
  const parts = [
    env.POSTGRES_USER,
    env.POSTGRES_PASSWORD,
    env.POSTGRES_HOST,
    env.POSTGRES_PORT,
    env.POSTGRES_DB,
  ];

  if (parts.some((part) => !part)) {
    throw new Error(
      "DATABASE_URL is not set and POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB must all be defined.",
    );
  }

  return `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;
}

export function createDatabase(databaseUrl = getDatabaseUrl()) {
  const queryClient = postgres(databaseUrl);
  return drizzle(queryClient, { schema });
}
