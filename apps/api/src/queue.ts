import type { Env, JobQueue, QueueJob } from "./types";

export class CloudflareJobQueue implements JobQueue {
  constructor(private readonly env: Env) {}

  async send(job: QueueJob): Promise<void> {
    if (this.env.JOBS) {
      await this.env.JOBS.send(job);
      return;
    }

    console.log("queue.local", job);
  }
}

export class RecordingJobQueue implements JobQueue {
  readonly jobs: QueueJob[] = [];

  async send(job: QueueJob): Promise<void> {
    this.jobs.push(job);
  }
}
