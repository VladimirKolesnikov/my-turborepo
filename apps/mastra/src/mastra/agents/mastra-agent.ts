import { Agent } from "@mastra/core/agent";
import {
  confirmTransactionTool,
  getProcessingRequestTool,
  listPendingReviewsTool,
  listRecentTransactionsTool,
  submitTextTransactionTool,
} from "../tools/gateway-tools.js";
import { initPrompts } from "../prompts/instructions.js";
import { sharedMemory } from "../memory/memory.js";

export const neoxiReviewAgent = new Agent({
  id: "neoxiReviewAgent",
  name: "neoxiReviewAgent",
  instructions: initPrompts,
  model: process.env.MASTRA_MODEL ?? "openai/gpt-4.1-mini",
  tools: {
    submitTextTransaction: submitTextTransactionTool,
    getProcessingRequest: getProcessingRequestTool,
    listPendingReviews: listPendingReviewsTool,
    listRecentTransactions: listRecentTransactionsTool,
    confirmTransaction: confirmTransactionTool,
  },
  memory: sharedMemory,
});
