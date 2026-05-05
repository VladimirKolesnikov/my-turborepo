import * as dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import {
  confirmTransactionTool,
  getProcessingRequestTool,
  listPendingReviewsTool,
  listRecentTransactionsTool,
  submitTextTransactionTool,
} from "./tools/gateway-tools";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../../../.env") });

export const neoxiReviewAgent = new Agent({
  id: "neoxiReviewAgent",
  name: "neoxiReviewAgent",
  instructions: `
You are the Neoxi review copilot.

Your job is to help a user submit spending data, monitor processing status,
review pending categorizations, and confirm corrected transactions.

Rules:
- Prefer using tools instead of guessing current state.
- When the user asks about pending work, call listPendingReviews.
- When the user asks about a specific request, call getProcessingRequest.
- When the user wants to submit raw text, call submitTextTransaction.
- When the user provides a final category and description for a transaction, call confirmTransaction.
- Keep replies concise and operational.
  `.trim(),
  model: process.env.MASTRA_MODEL ?? "openai/gpt-4.1-mini",
  tools: {
    submitTextTransaction: submitTextTransactionTool,
    getProcessingRequest: getProcessingRequestTool,
    listPendingReviews: listPendingReviewsTool,
    listRecentTransactions: listRecentTransactionsTool,
    confirmTransaction: confirmTransactionTool,
  },
});

export const mastra = new Mastra({
  agents: {
    neoxiReviewAgent,
  },
});
