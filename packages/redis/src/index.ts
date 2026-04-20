import { RedisOptions } from "ioredis";

export interface RedisConfig extends RedisOptions {
  host: string;
  port: number;
  password: string;
  maxRetriesPerRequest: null;
}

export function getRedisConfig(
  env: NodeJS.ProcessEnv = process.env,
): RedisConfig {
  return {
    host: env.REDIS_HOST || "localhost",
    port: Number(env.REDIS_PORT) || 6379,
    password: env.REDIS_PASSWORD || "secret_password",
    maxRetriesPerRequest: null,
  };
}
