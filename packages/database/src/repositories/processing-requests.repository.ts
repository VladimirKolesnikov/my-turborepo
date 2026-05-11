import { eq } from "drizzle-orm";
import type { databaseType } from "../index";
import { processingRequests } from "../schema";
import { PROCESSING_REQUEST_STATUS_QUEUED } from "../constants/bootstrap";

type CreateProcessingRequestInput = {
  userId: string;
  sourceType: string;
  sourceName?: string | null;
  rawContent: string;
  statusCode?: string;
};

export class ProcessingRequestsRepository {
  constructor(private readonly db: databaseType) {}

  async create(input: CreateProcessingRequestInput) {
    const [row] = await this.db
      .insert(processingRequests)
      .values({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceName: input.sourceName ?? null,
        rawContent: input.rawContent,
        statusCode: input.statusCode ?? PROCESSING_REQUEST_STATUS_QUEUED,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create processing request");
    }

    return row;
  }

  async updateStatus(
    id: string,
    statusCode: string,
    errorMessage?: string | null,
  ) {
    await this.db
      .update(processingRequests)
      .set({
        statusCode,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(processingRequests.id, id));
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(processingRequests)
      .where(eq(processingRequests.id, id));

    return row ?? null;
  }
}
