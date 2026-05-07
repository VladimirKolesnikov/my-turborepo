import * as dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { Mastra } from "@mastra/core/mastra";
import { neoxiReviewAgent } from "./agents/mastra-agent.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../../../.env") });

export const mastra = new Mastra({
  agents: {
    neoxiReviewAgent,
  },
});
