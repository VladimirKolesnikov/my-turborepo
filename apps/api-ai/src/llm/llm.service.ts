import { Injectable, Logger } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import { z } from 'zod';
import { CLEAN_USER_MESSAGE_PROMPT } from './prompts/clean-user-message';
import { PARSE_FINANCIAL_MESSAGE_PROMPT } from './prompts/parse-financial-message';

export interface RagContextItem {
  content: string;
  confirmedCategoryName: string;
}

const FinancialEventSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const ParsedFinancialMessageSchema = z.object({
  wallet_balance_after: z.number(),
  total_income: z.number().min(0),
  total_expenses: z.number().min(0),
  events: z.array(FinancialEventSchema).min(1),
});

export type FinancialEvent = z.infer<typeof FinancialEventSchema>;
export type ParsedFinancialMessage = z.infer<typeof ParsedFinancialMessageSchema>;

const RETRY_DELAYS_MS = [3000, 8000, 20000]; // 3s, 8s, 20s

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: OpenRouter;
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    this.client = new OpenRouter({ apiKey });
    this.chatModel = process.env.OPENROUTER_CHAT_MODEL ?? 'google/gemini-2.0-flash-001';
    this.embeddingModel = process.env.OPENROUTER_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
  }

  private isRateLimitError(err: unknown): boolean {
    // OpenRouterError base class exposes statusCode — duck-type instead of
    // importing subclasses which aren't resolvable under this moduleResolution setting.
    return (
      typeof err === 'object' &&
      err !== null &&
      'statusCode' in err &&
      (err as { statusCode: number }).statusCode === 429
    );
  }

  private async withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (!this.isRateLimitError(err)) throw err;

        lastError = err;
        const delay = RETRY_DELAYS_MS[attempt];

        if (delay === undefined) break;

        this.logger.warn(
          `${label} rate-limited (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}), retrying in ${delay / 1000}s…`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async cleanUserMessage(rawContent: string): Promise<string> {
    this.logger.debug('Cleaning user message');

    const result = await this.withRetry('cleanUserMessage', () =>
      this.client.chat.send({
        chatRequest: {
          model: this.chatModel,
          messages: [
            { role: 'system', content: CLEAN_USER_MESSAGE_PROMPT },
            { role: 'user', content: rawContent },
          ],
          temperature: 0,
        },
      }),
    );

    const text = result.choices[0]?.message?.content;
    if (typeof text !== 'string' || text.trim() === '') {
      throw new Error('LLM returned empty response for cleanUserMessage');
    }

    const cleaned = text.trim();
    if (cleaned === 'NONE') {
      throw new Error('No financial information found in the message');
    }

    return cleaned;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.logger.debug('Generating embedding');

    const result = await this.withRetry('generateEmbedding', () =>
      this.client.embeddings.generate({
        requestBody: {
          model: this.embeddingModel,
          input: text,
        },
      }),
    );

    if (typeof result === 'string') {
      throw new Error('Unexpected string response from embeddings API');
    }

    const embedding = result.data[0]?.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error('Embeddings API returned non-array embedding');
    }

    return embedding as number[];
  }

  async parseFinancialMessage(
    cleanedText: string,
    walletBalance: string,
    currency: string,
    ragContext: RagContextItem[],
  ): Promise<ParsedFinancialMessage> {
    this.logger.debug('Parsing financial message');

    const contextBlock =
      ragContext.length > 0
        ? ragContext
            .map((item) => `- "${item.content}" → category: "${item.confirmedCategoryName}"`)
            .join('\n')
        : 'No past examples available.';

    const userMessage = `Current wallet balance: ${walletBalance} ${currency}

Past confirmed categories (use these for consistent naming):
${contextBlock}

Financial information to analyze:
"${cleanedText}"`;

    this.logger.debug(`[parseFinancialMessage] wallet balance sent to LLM: ${walletBalance} ${currency}`);
    this.logger.debug(`[parseFinancialMessage] user message:\n${userMessage}`);

    const result = await this.withRetry('parseFinancialMessage', () =>
      this.client.chat.send({
        chatRequest: {
          model: this.chatModel,
          messages: [
            { role: 'system', content: PARSE_FINANCIAL_MESSAGE_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0,
        },
      }),
    );

    const text = result.choices[0]?.message?.content;
    if (typeof text !== 'string' || text.trim() === '') {
      throw new Error('LLM returned empty response for parseFinancialMessage');
    }

    this.logger.debug(`[parseFinancialMessage] raw LLM response:\n${text}`);

    const resultMatch = text.match(/<result>([\s\S]*?)<\/result>/);
    if (!resultMatch?.[1]) {
      throw new Error('LLM response did not contain a <result> block');
    }

    this.logger.debug(`[parseFinancialMessage] extracted <result> block:\n${resultMatch[1].trim()}`);

    let parsed: unknown;
    try {
      parsed = JSON.parse(resultMatch[1].trim());
    } catch {
      throw new Error(`Failed to parse JSON from LLM <result> block`);
    }

    return ParsedFinancialMessageSchema.parse(parsed);
  }
}
