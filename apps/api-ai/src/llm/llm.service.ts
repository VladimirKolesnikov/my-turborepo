import { Injectable, Logger } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';
import { z } from 'zod';
import { CLEAN_USER_MESSAGE_PROMPT } from './prompts/clean-user-message';
import { CATEGORIZE_TRANSACTION_PROMPT } from './prompts/categorize-transaction';

export interface RagContextItem {
  content: string;
  confirmedCategoryName: string;
}

const CategorizedTransactionSchema = z.object({
  categoryName: z.string().min(1),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type CategorizedTransaction = z.infer<typeof CategorizedTransactionSchema>;

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

  async cleanUserMessage(rawContent: string): Promise<string> {
    this.logger.debug('Cleaning user message');

    const result = await this.client.chat.send({
      chatRequest: {
        model: this.chatModel,
        messages: [
          { role: 'system', content: CLEAN_USER_MESSAGE_PROMPT },
          { role: 'user', content: rawContent },
        ],
        temperature: 0,
      },
    });

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

    const result = await this.client.embeddings.generate({
      requestBody: {
        model: this.embeddingModel,
        input: text,
      },
    });

    if (typeof result === 'string') {
      throw new Error('Unexpected string response from embeddings API');
    }

    const embedding = result.data[0]?.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error('Embeddings API returned non-array embedding');
    }

    return embedding as number[];
  }

  async categorizeTransaction(
    cleanedText: string,
    ragContext: RagContextItem[],
  ): Promise<CategorizedTransaction> {
    this.logger.debug('Categorizing transaction');

    const contextBlock =
      ragContext.length > 0
        ? ragContext
            .map((item) => `- "${item.content}" → category: "${item.confirmedCategoryName}"`)
            .join('\n')
        : 'No past examples available.';

    const userMessage = `Past confirmed transactions:\n${contextBlock}\n\nNew transaction to categorize:\n"${cleanedText}"`;

    const result = await this.client.chat.send({
      chatRequest: {
        model: this.chatModel,
        messages: [
          { role: 'system', content: CATEGORIZE_TRANSACTION_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0,
        responseFormat: { type: 'json_object' },
      },
    });

    const text = result.choices[0]?.message?.content;
    if (typeof text !== 'string' || text.trim() === '') {
      throw new Error('LLM returned empty response for categorizeTransaction');
    }

    const parsed: unknown = JSON.parse(text);
    return CategorizedTransactionSchema.parse(parsed);
  }
}
