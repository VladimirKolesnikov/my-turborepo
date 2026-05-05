import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const processingRequestSchema = z
  .object({
    id: z.string(),
    statusCode: z.string(),
    sourceType: z.string(),
    sourceName: z.string().nullable().optional(),
    rawContent: z.string(),
    errorMessage: z.string().nullable().optional(),
  })
  .nullable();

const workspaceTransactionSchema = z.record(z.string(), z.unknown());

function getGatewayBaseUrl(): string {
  return (
    process.env.API_GATEWAY_INTERNAL_URL ??
    `http://127.0.0.1:${process.env.API_GATEWAY_PORT ?? "3001"}`
  );
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getGatewayBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Gateway request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ProcessingRequestResponse = {
  request: {
    id: string;
    statusCode: string;
    sourceType: string;
    sourceName?: string | null;
    rawContent: string;
    errorMessage?: string | null;
  } | null;
  transactions: Record<string, unknown>[];
};

async function waitForProcessingRequest(
  requestId: string,
  timeoutMs = 30000,
  intervalMs = 1000,
): Promise<{
  completed: boolean;
  request: ProcessingRequestResponse["request"];
  transactions: ProcessingRequestResponse["transactions"];
}> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const payload = await getJson<ProcessingRequestResponse>(
      `/processing-requests/${requestId}`,
    );
    const statusCode = payload.request?.statusCode;

    if (statusCode === "review_ready" || statusCode === "failed") {
      return {
        completed: true,
        request: payload.request,
        transactions: payload.transactions,
      };
    }

    await delay(intervalMs);
  }

  const payload = await getJson<ProcessingRequestResponse>(
    `/processing-requests/${requestId}`,
  );

  return {
    completed: false,
    request: payload.request,
    transactions: payload.transactions,
  };
}

export const submitTextTransactionTool = createTool({
  id: "submitTextTransaction",
  description:
    "Submit a natural-language transaction request, wait for processing, and return the review-ready result when available.",
  inputSchema: z.object({
    text: z.string().min(1),
  }),
  outputSchema: z.object({
    requestId: z.string(),
    statusCode: z.string(),
    completed: z.boolean(),
    request: processingRequestSchema,
    transactions: z.array(workspaceTransactionSchema),
  }),
  execute: async (input) => {
    const submission = await getJson<{ requestId: string; statusCode: string }>(
      "/transactions/text",
      {
      method: "POST",
      body: JSON.stringify({ text: input.text }),
      },
    );
    const result = await waitForProcessingRequest(submission.requestId);

    return {
      requestId: submission.requestId,
      statusCode: result.request?.statusCode ?? submission.statusCode,
      completed: result.completed,
      request: result.request,
      transactions: result.transactions,
    };
  },
});

export const getProcessingRequestTool = createTool({
  id: "getProcessingRequest",
  description: "Fetch a processing request and its reviewable transaction results.",
  inputSchema: z.object({
    requestId: z.string().min(1),
  }),
  outputSchema: z.object({
    request: processingRequestSchema,
    transactions: z.array(workspaceTransactionSchema),
  }),
  execute: async (input) =>
    getJson(`/processing-requests/${input.requestId}`),
});

export const listPendingReviewsTool = createTool({
  id: "listPendingReviews",
  description: "List transactions waiting for user review.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    items: z.array(z.record(z.string(), z.unknown())),
  }),
  execute: async () => getJson("/transactions/review-queue"),
});

export const listRecentTransactionsTool = createTool({
  id: "listRecentTransactions",
  description: "List the user's recent processed transactions.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    items: z.array(z.record(z.string(), z.unknown())),
  }),
  execute: async () => getJson("/transactions/recent"),
});

export const confirmTransactionTool = createTool({
  id: "confirmTransaction",
  description: "Confirm a reviewed transaction with a final category and description.",
  inputSchema: z.object({
    transactionId: z.string().min(1),
    categoryName: z.string().min(1),
    description: z.string().min(1),
  }),
  outputSchema: z.object({
    transactionId: z.string(),
  }),
  execute: async (input) =>
    getJson(`/transactions/${input.transactionId}/confirm`, {
      method: "POST",
      body: JSON.stringify({
        categoryName: input.categoryName,
        description: input.description,
      }),
    }),
});
