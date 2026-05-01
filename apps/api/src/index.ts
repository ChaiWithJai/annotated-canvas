import { handleRequest } from "./app";
import type { Env, QueueJob } from "./types";

export class EngagementCounter {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const current = (await this.state.storage.get<number>("count")) ?? 0;

    if (request.method === "POST" && url.pathname.endsWith("/increment")) {
      const next = current + 1;
      await this.state.storage.put("count", next);
      return Response.json({ count: next });
    }

    return Response.json({ count: current });
  }
}

async function handleQueue(batch: MessageBatch<QueueJob>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body;

    if (env.DB) {
      const existing = await env.DB.prepare("SELECT job_id FROM queue_idempotency_keys WHERE job_id = ?")
        .bind(job.job_id)
        .first();
      if (existing) {
        message.ack();
        continue;
      }

      await env.DB.prepare("INSERT INTO queue_idempotency_keys (job_id, job_type) VALUES (?, ?)")
        .bind(job.job_id, job.type)
        .run();
    }

    console.log("queue.processed", job);
    message.ack();
  }
}

export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
  queue(batch: MessageBatch<QueueJob>, env: Env) {
    return handleQueue(batch, env);
  }
};
