import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('queueProcessor', { concurrency: 10 })
export class QueueProcessor extends WorkerHost {

  async process(job: Job<string, string, string>): Promise<any> {
    const data = job.data;

    return {
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: 'processing',
      }
    };
  }
}
