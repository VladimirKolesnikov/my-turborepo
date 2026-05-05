import { MastraClient } from "@mastra/client-js";

interface CopilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { messages?: CopilotMessage[] };
  const messages = body.messages ?? [];

  if (messages.length === 0) {
    return Response.json(
      { error: 'Request body must include a non-empty "messages" array.' },
      { status: 400 },
    );
  }

  const client = new MastraClient({
    baseUrl:
      process.env.MASTRA_BASE_URL ??
      `http://127.0.0.1:${process.env.MASTRA_PORT ?? "4111"}`,
  });

  const agent = client.getAgent("neoxiReviewAgent");
  const response = await agent.generate({ messages });
  const text =
    typeof response === "string"
      ? response
      : "text" in response && typeof response.text === "string"
        ? response.text
        : JSON.stringify(response, null, 2);

  return Response.json({ text, raw: response });
}
