import {
  AnnotationCreateSchema,
  ClaimCreateSchema,
  EngagementCreateSchema,
  SourceRefSchema,
  createRequestId,
  toSourceDomain
} from "@annotated/contracts";
import { InMemoryRepository } from "./repository";
import { CloudflareJobQueue } from "./queue";
import type { Env, JobQueue, QueueJob, Repository } from "./types";

interface Services {
  repository: Repository;
  jobs: JobQueue;
}

const defaultRepository = new InMemoryRepository();

export function makeServices(env: Env): Services {
  return {
    repository: defaultRepository,
    jobs: new CloudflareJobQueue(env)
  };
}

function corsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.APP_ORIGIN ?? "*",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
}

function json(env: Env, body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(env),
      ...init.headers
    }
  });
}

function error(env: Env, status: number, code: string, message: string, details: Record<string, unknown> = {}): Response {
  return json(
    env,
    {
      error: { code, message, details },
      request_id: createRequestId()
    },
    { status }
  );
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.body) return {};
  return request.json();
}

function requireIdempotencyKey(request: Request): string | Response {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length < 8) {
    return new Response("missing idempotency key", { status: 428 });
  }
  return key;
}

function queueJob(type: QueueJob["type"], ids: Partial<Pick<QueueJob, "annotation_id" | "claim_id">>): QueueJob {
  return {
    job_id: `job_${crypto.randomUUID()}`,
    type,
    created_at: new Date().toISOString(),
    ...ids
  };
}

export async function handleRequest(request: Request, env: Env, services = makeServices(env)): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(env) });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json(env, {
      ok: true,
      service: "annotated-canvas-api",
      mode: env.SERVICE_MODE ?? "in-process"
    });
  }

  if (url.pathname === "/api/me" && request.method === "GET") {
    return json(env, {
      user: {
        id: "usr_demo",
        handle: "mira",
        display_name: "Mira Chen"
      },
      auth: {
        providers: ["x", "google"],
        extension_token_supported: true
      }
    });
  }

  if (url.pathname === "/api/captures/resolve" && request.method === "POST") {
    const body = await readJson(request);
    const parsed = SourceRefSchema.pick({
      source_url: true,
      title: true
    })
      .extend({
        source_domain: SourceRefSchema.shape.source_domain.optional()
      })
      .safeParse(body);

    if (!parsed.success) {
      return error(env, 400, "invalid_source", "A valid source_url and title are required.", parsed.error.flatten());
    }

    const source = SourceRefSchema.parse({
      ...parsed.data,
      source_domain: parsed.data.source_domain ?? toSourceDomain(parsed.data.source_url)
    });

    return json(env, { source });
  }

  if (url.pathname === "/api/feed" && request.method === "GET") {
    return json(env, {
      items: await services.repository.listFeed(),
      next_cursor: null
    });
  }

  if (url.pathname === "/api/annotations" && request.method === "POST") {
    const idempotencyKey = requireIdempotencyKey(request);
    if (idempotencyKey instanceof Response) {
      return error(env, 428, "idempotency_key_required", "POST /api/annotations requires Idempotency-Key.");
    }

    const parsed = AnnotationCreateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return error(env, 400, "invalid_annotation", "Annotation payload failed validation.", parsed.error.flatten());
    }

    const annotation = await services.repository.publishAnnotation(parsed.data, idempotencyKey);
    await services.jobs.send(queueJob("feed_fanout", { annotation_id: annotation.id }));
    return json(env, { annotation }, { status: 201 });
  }

  const annotationMatch = url.pathname.match(/^\/api\/annotations\/([^/]+)$/);
  if (annotationMatch && request.method === "GET") {
    const annotation = await services.repository.findAnnotation(annotationMatch[1]);
    if (!annotation || annotation.visibility === "deleted") {
      return error(env, 404, "annotation_not_found", "This annotation has been removed or does not exist.");
    }

    return json(env, { annotation });
  }

  const engagementMatch = url.pathname.match(/^\/api\/annotations\/([^/]+)\/engagement$/);
  if (engagementMatch && request.method === "POST") {
    const idempotencyKey = requireIdempotencyKey(request);
    if (idempotencyKey instanceof Response) {
      return error(env, 428, "idempotency_key_required", "Engagement mutations require Idempotency-Key.");
    }

    const parsed = EngagementCreateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return error(env, 400, "invalid_engagement", "Engagement payload failed validation.", parsed.error.flatten());
    }

    try {
      const annotation = await services.repository.recordEngagement(
        engagementMatch[1],
        parsed.data.type,
        idempotencyKey
      );
      return json(env, { annotation });
    } catch {
      return error(env, 404, "annotation_not_found", "Cannot engage with an unknown annotation.");
    }
  }

  if (url.pathname === "/api/claims" && request.method === "POST") {
    const parsed = ClaimCreateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return error(env, 400, "invalid_claim", "Claim payload failed validation.", parsed.error.flatten());
    }

    const annotation = await services.repository.findAnnotation(parsed.data.annotation_id);
    if (!annotation) {
      return error(env, 404, "annotation_not_found", "Claims must target an existing annotation.");
    }

    const claim = await services.repository.createClaim(
      parsed.data,
      request.headers.get("Idempotency-Key") ?? undefined
    );
    await services.jobs.send(queueJob("claim_notice", { claim_id: claim.id, annotation_id: claim.annotation_id }));
    return json(env, { claim }, { status: 202 });
  }

  if (url.pathname === "/api/uploads/audio-commentary" && request.method === "POST") {
    return json(env, {
      upload: {
        id: `upl_${crypto.randomUUID()}`,
        kind: "audio-commentary",
        storage: "r2",
        max_bytes: 25 * 1024 * 1024,
        status: "intent-created"
      }
    });
  }

  if (url.pathname === "/api/uploads/owned-video" && request.method === "POST") {
    return json(env, {
      upload: {
        id: `upl_${crypto.randomUUID()}`,
        kind: "owned-video",
        storage: "stream",
        status: "intent-created"
      }
    });
  }

  return error(env, 404, "route_not_found", "No route matches this request.");
}
