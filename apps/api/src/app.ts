import {
  AnnotationCreateSchema,
  AuthProviderSchema,
  ClaimCreateSchema,
  ClaimEventCreateSchema,
  CommentCreateSchema,
  EngagementCreateSchema,
  SourceRefSchema,
  createRequestId,
  toSourceDomain
} from "@annotated/contracts";
import { D1Repository, InMemoryRepository } from "./repository";
import { CloudflareJobQueue } from "./queue";
import type { Env, JobQueue, QueueJob, Repository } from "./types";

interface Services {
  repository: Repository;
  jobs: JobQueue;
}

const defaultRepository = new InMemoryRepository();

export function makeServices(env: Env): Services {
  return {
    repository: env.DB ? new D1Repository(env.DB) : defaultRepository,
    jobs: new CloudflareJobQueue(env)
  };
}

function corsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
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

  const authStartMatch = url.pathname.match(/^\/api\/auth\/([^/]+)\/start$/);
  if (authStartMatch && request.method === "GET") {
    const provider = AuthProviderSchema.safeParse(authStartMatch[1]);
    if (!provider.success) {
      return error(env, 400, "unsupported_auth_provider", "Auth provider must be x or google.");
    }

    const returnTo = url.searchParams.get("return_to") ?? "/";
    const state = `state_${crypto.randomUUID()}`;
    const mode = env.AUTH_MODE ?? "demo";
    const callbackUrl = new URL(`/api/auth/${provider.data}/callback`, url.origin);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("return_to", returnTo);
    if (mode === "demo") callbackUrl.searchParams.set("code", "demo");

    if (env.SESSION_KV) {
      await env.SESSION_KV.put(
        `oauth_state:${state}`,
        JSON.stringify({ provider: provider.data, return_to: returnTo }),
        { expirationTtl: 600 }
      );
    }

    const clientId = provider.data === "google" ? env.GOOGLE_CLIENT_ID : env.X_CLIENT_ID;
    const authorizationUrl =
      mode === "oauth" && clientId
        ? buildProviderAuthorizationUrl(provider.data, clientId, callbackUrl.toString(), state)
        : callbackUrl.toString();

    return json(env, {
      provider: provider.data,
      mode,
      authorization_url: authorizationUrl,
      state
    });
  }

  const authCallbackMatch = url.pathname.match(/^\/api\/auth\/([^/]+)\/callback$/);
  if (authCallbackMatch && request.method === "GET") {
    const provider = AuthProviderSchema.safeParse(authCallbackMatch[1]);
    if (!provider.success) {
      return error(env, 400, "unsupported_auth_provider", "Auth provider must be x or google.");
    }

    const state = url.searchParams.get("state");
    const returnTo = url.searchParams.get("return_to") ?? "/";
    if (!state) {
      return error(env, 400, "oauth_state_required", "OAuth callback requires state.");
    }

    const sessionId = `ses_${crypto.randomUUID()}`;
    if (env.SESSION_KV) {
      await env.SESSION_KV.put(
        `session:${sessionId}`,
        JSON.stringify({ user_id: "usr_demo", provider: provider.data }),
        { expirationTtl: 60 * 60 * 24 * 14 }
      );
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: returnTo,
        "Set-Cookie": `annotated_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
        ...corsHeaders(env)
      }
    });
  }

  if (url.pathname === "/api/auth/extension-token" && request.method === "POST") {
    return json(env, {
      token: `ext_${crypto.randomUUID()}`,
      expires_in: 3600,
      token_type: "Bearer"
    });
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    return json(
      env,
      { ok: true },
      {
        headers: {
          "Set-Cookie": "annotated_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        }
      }
    );
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

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && request.method === "GET") {
    const user = await services.repository.findUserByHandle(userMatch[1]);
    if (!user) {
      return error(env, 404, "user_not_found", "No user exists with that handle.");
    }
    return json(env, { user });
  }

  const userAnnotationsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/annotations$/);
  if (userAnnotationsMatch && request.method === "GET") {
    return json(env, {
      items: await services.repository.listUserAnnotations(userAnnotationsMatch[1]),
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

  const commentsMatch = url.pathname.match(/^\/api\/annotations\/([^/]+)\/comments$/);
  if (commentsMatch && request.method === "GET") {
    const annotation = await services.repository.findAnnotation(commentsMatch[1]);
    if (!annotation || annotation.visibility === "deleted") {
      return error(env, 404, "annotation_not_found", "Cannot list comments for an unknown annotation.");
    }

    return json(env, {
      items: await services.repository.listComments(commentsMatch[1]),
      next_cursor: null
    });
  }

  if (commentsMatch && request.method === "POST") {
    const idempotencyKey = requireIdempotencyKey(request);
    if (idempotencyKey instanceof Response) {
      return error(env, 428, "idempotency_key_required", "Comment mutations require Idempotency-Key.");
    }

    const parsed = CommentCreateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return error(env, 400, "invalid_comment", "Comment payload failed validation.", parsed.error.flatten());
    }

    try {
      const comment = await services.repository.createComment(commentsMatch[1], parsed.data, idempotencyKey);
      return json(env, { comment }, { status: 201 });
    } catch {
      return error(env, 404, "annotation_not_found", "Cannot comment on an unknown or removed annotation.");
    }
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

  const followMatch = url.pathname.match(/^\/api\/follows\/([^/]+)$/);
  if (followMatch && (request.method === "PUT" || request.method === "DELETE")) {
    try {
      const user = await services.repository.setFollow(followMatch[1], request.method === "PUT");
      return json(env, { user });
    } catch {
      return error(env, 404, "user_not_found", "Cannot follow an unknown user.");
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

  const claimMatch = url.pathname.match(/^\/api\/claims\/([^/]+)$/);
  if (claimMatch && request.method === "GET") {
    const claim = await services.repository.findClaim(claimMatch[1]);
    if (!claim) {
      return error(env, 404, "claim_not_found", "No claim exists with that id.");
    }
    return json(env, {
      claim,
      events: await services.repository.listClaimEvents(claim.id)
    });
  }

  const claimEventMatch = url.pathname.match(/^\/api\/claims\/([^/]+)\/events$/);
  if (claimEventMatch && request.method === "POST") {
    const parsed = ClaimEventCreateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return error(env, 400, "invalid_claim_event", "Claim event payload failed validation.", parsed.error.flatten());
    }

    try {
      const event = await services.repository.createClaimEvent(claimEventMatch[1], parsed.data);
      const claim = await services.repository.findClaim(claimEventMatch[1]);
      return json(env, { claim, event }, { status: 201 });
    } catch {
      return error(env, 404, "claim_not_found", "Cannot add an event to an unknown claim.");
    }
  }

  if (url.pathname === "/api/uploads/audio-commentary" && request.method === "POST") {
    const id = `upl_${crypto.randomUUID()}`;
    const key = `audio-commentary/${id}.webm`;
    if (env.MEDIA_BUCKET && request.body) {
      await env.MEDIA_BUCKET.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get("Content-Type") ?? "audio/webm"
        }
      });
    }

    return json(env, {
      upload: {
        id,
        asset_id: id,
        kind: "audio-commentary",
        storage: "r2",
        r2_key: key,
        max_bytes: 25 * 1024 * 1024,
        status: env.MEDIA_BUCKET && request.body ? "stored" : "intent-created"
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

function buildProviderAuthorizationUrl(
  provider: "x" | "google",
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const authorizationUrl =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://twitter.com/i/oauth2/authorize");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("scope", provider === "google" ? "openid email profile" : "users.read tweet.read");
  return authorizationUrl.toString();
}
