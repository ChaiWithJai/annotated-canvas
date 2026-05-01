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
import { D1Repository, InMemoryRepository, normalizeAppOrigin } from "./repository";
import { CloudflareJobQueue } from "./queue";
import type { Env, JobQueue, QueueJob, Repository } from "./types";

interface Services {
  repository: Repository;
  jobs: JobQueue;
}

type AuthProvider = "x" | "google";

interface OAuthState {
  provider: AuthProvider;
  return_to: string;
}

interface AuthSession {
  user_id: string;
  provider?: AuthProvider;
  handle?: string;
  display_name?: string;
}

const DEMO_USER = {
  id: "usr_demo",
  handle: "mira",
  display_name: "Mira Chen"
};

const defaultRepositories = new Map<string, InMemoryRepository>();

function getDefaultRepository(appOrigin: string): InMemoryRepository {
  const existing = defaultRepositories.get(appOrigin);
  if (existing) return existing;

  const repository = new InMemoryRepository(undefined, appOrigin);
  defaultRepositories.set(appOrigin, repository);
  return repository;
}

export function makeServices(env: Env): Services {
  const appOrigin = normalizeAppOrigin(env.APP_ORIGIN);
  return {
    repository: env.DB ? new D1Repository(env.DB, appOrigin) : getDefaultRepository(appOrigin),
    jobs: new CloudflareJobQueue(env)
  };
}

function isAllowedCorsOrigin(origin: string, env: Env): boolean {
  const appOrigin = normalizeAppOrigin(env.APP_ORIGIN);
  return (
    origin === appOrigin ||
    origin === "http://localhost:5173" ||
    origin === "http://127.0.0.1:5173" ||
    origin.startsWith("chrome-extension://")
  );
}

function corsHeaders(env: Env, request?: Request): HeadersInit {
  const origin = request?.headers.get("Origin");
  const accessControlOrigin = origin && isAllowedCorsOrigin(origin, env) ? origin : "*";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": accessControlOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  if (accessControlOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

function json(env: Env, body: unknown, init: ResponseInit = {}, request?: Request): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(env, request),
      ...init.headers
    }
  });
}

function error(
  env: Env,
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
  request?: Request
): Response {
  return json(
    env,
    {
      error: { code, message, details },
      request_id: createRequestId()
    },
    { status },
    request
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

function authMode(env: Env): "demo" | "oauth" {
  return env.AUTH_MODE ?? "demo";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProviderCredentials(env: Env, provider: AuthProvider) {
  return provider === "google"
    ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        clientIdName: "GOOGLE_CLIENT_ID",
        clientSecretName: "GOOGLE_CLIENT_SECRET"
      }
    : {
        clientId: env.X_CLIENT_ID,
        clientSecret: env.X_CLIENT_SECRET,
        clientIdName: "X_CLIENT_ID",
        clientSecretName: "X_CLIENT_SECRET"
      };
}

function missingOAuthConfig(env: Env, provider: AuthProvider): string[] {
  const credentials = getProviderCredentials(env, provider);
  return [
    !credentials.clientId ? credentials.clientIdName : null,
    !credentials.clientSecret ? credentials.clientSecretName : null,
    !env.SESSION_KV ? "SESSION_KV" : null
  ].filter((item): item is string => Boolean(item));
}

function oauthConfigError(env: Env, request: Request, provider: AuthProvider, missing: string[]): Response {
  return error(env, 503, "auth_not_configured", "OAuth is not configured for this provider.", {
    provider,
    missing
  }, request);
}

function parseCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName !== name) continue;
    const value = rawValue.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

function parseOAuthState(value: string): OAuthState | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      isRecord(parsed) &&
      (parsed.provider === "x" || parsed.provider === "google") &&
      typeof parsed.return_to === "string"
    ) {
      return {
        provider: parsed.provider,
        return_to: parsed.return_to
      };
    }
  } catch {
    return null;
  }

  return null;
}

function parseAuthSession(value: string): AuthSession | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || typeof parsed.user_id !== "string" || parsed.user_id.length === 0) {
      return null;
    }

    return {
      user_id: parsed.user_id,
      provider: parsed.provider === "x" || parsed.provider === "google" ? parsed.provider : undefined,
      handle: typeof parsed.handle === "string" ? parsed.handle : undefined,
      display_name: typeof parsed.display_name === "string" ? parsed.display_name : undefined
    };
  } catch {
    return null;
  }
}

async function requireOAuthSession(request: Request, env: Env): Promise<AuthSession | Response> {
  if (!env.SESSION_KV) {
    return error(env, 503, "auth_not_configured", "OAuth sessions require SESSION_KV.", {}, request);
  }

  const sessionId = parseCookie(request, "annotated_session");
  if (!sessionId) {
    return error(env, 401, "authentication_required", "A valid session is required.", {}, request);
  }

  const sessionPayload = await env.SESSION_KV.get(`session:${sessionId}`);
  if (!sessionPayload) {
    return error(env, 401, "authentication_required", "A valid session is required.", {}, request);
  }

  const session = parseAuthSession(sessionPayload);
  if (!session) {
    return error(env, 401, "authentication_required", "A valid session is required.", {}, request);
  }

  return session;
}

function resolveReturnTo(env: Env, rawReturnTo: string | null): string {
  const appOrigin = normalizeAppOrigin(env.APP_ORIGIN);
  if (!rawReturnTo) return appOrigin;

  try {
    const candidate = new URL(rawReturnTo, appOrigin);
    if (candidate.origin === appOrigin) return candidate.toString();
  } catch {
    return appOrigin;
  }

  return appOrigin;
}

function sessionCookie(name: string, value: string, env: Env, maxAgeSeconds: number): string {
  const encodedValue = encodeURIComponent(value);
  const sameSite = normalizeAppOrigin(env.APP_ORIGIN).startsWith("https://") ? "SameSite=None; Secure" : "SameSite=Lax";
  return `${name}=${encodedValue}; Path=/; HttpOnly; ${sameSite}; Max-Age=${maxAgeSeconds}`;
}

function expiredSessionCookie(env: Env): string {
  return `${sessionCookie("annotated_session", "", env, 0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function userFromSession(session: AuthSession) {
  return {
    id: session.user_id,
    handle: session.handle ?? DEMO_USER.handle,
    display_name: session.display_name ?? DEMO_USER.display_name
  };
}

export async function handleRequest(request: Request, env: Env, services = makeServices(env)): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(env, request) });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json(env, {
      ok: true,
      service: "annotated-canvas-api",
      mode: env.SERVICE_MODE ?? "in-process"
    });
  }

  if (url.pathname === "/api/me" && request.method === "GET") {
    if (authMode(env) === "oauth") {
      const session = await requireOAuthSession(request, env);
      if (session instanceof Response) return session;

      return json(env, {
        user: userFromSession(session),
        auth: {
          providers: ["x", "google"],
          extension_token_supported: true
        }
      }, {}, request);
    }

    return json(env, {
      user: DEMO_USER,
      auth: {
        providers: ["x", "google"],
        extension_token_supported: true
      }
    }, {}, request);
  }

  const authStartMatch = url.pathname.match(/^\/api\/auth\/([^/]+)\/start$/);
  if (authStartMatch && request.method === "GET") {
    const provider = AuthProviderSchema.safeParse(authStartMatch[1]);
    if (!provider.success) {
      return error(env, 400, "unsupported_auth_provider", "Auth provider must be x or google.");
    }

    const returnTo = resolveReturnTo(env, url.searchParams.get("return_to"));
    const state = `state_${crypto.randomUUID()}`;
    const mode = authMode(env);
    const credentials = getProviderCredentials(env, provider.data);
    const missing = mode === "oauth" ? missingOAuthConfig(env, provider.data) : [];
    if (missing.length > 0) {
      return oauthConfigError(env, request, provider.data, missing);
    }

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

    const authorizationUrl =
      mode === "oauth" && credentials.clientId
        ? buildProviderAuthorizationUrl(provider.data, credentials.clientId, callbackUrl.toString(), state)
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
    const returnTo = resolveReturnTo(env, url.searchParams.get("return_to"));
    if (!state) {
      return error(env, 400, "oauth_state_required", "OAuth callback requires state.");
    }

    if (authMode(env) === "oauth") {
      const code = url.searchParams.get("code");
      if (!code) {
        return error(env, 400, "oauth_code_required", "OAuth callback requires code.");
      }

      if (!env.SESSION_KV) {
        return error(env, 503, "auth_not_configured", "OAuth state validation requires SESSION_KV.");
      }

      const stateKey = `oauth_state:${state}`;
      const storedStatePayload = await env.SESSION_KV.get(stateKey);
      if (!storedStatePayload) {
        return error(env, 400, "invalid_oauth_state", "OAuth state is invalid or has already been used.");
      }

      await env.SESSION_KV.delete(stateKey);
      const storedState = parseOAuthState(storedStatePayload);
      if (!storedState || storedState.provider !== provider.data) {
        return error(env, 400, "invalid_oauth_state", "OAuth state is invalid or has already been used.");
      }

      return error(env, 501, "not_implemented", "OAuth token exchange is not implemented.", {
        provider: provider.data
      });
    }

    const sessionId = `ses_${crypto.randomUUID()}`;
    if (env.SESSION_KV) {
      await env.SESSION_KV.put(
        `session:${sessionId}`,
        JSON.stringify({
          user_id: DEMO_USER.id,
          provider: provider.data,
          handle: DEMO_USER.handle,
          display_name: DEMO_USER.display_name
        }),
        { expirationTtl: 60 * 60 * 24 * 14 }
      );
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: returnTo,
        "Set-Cookie": sessionCookie("annotated_session", sessionId, env, 1209600),
        ...corsHeaders(env, request)
      }
    });
  }

  if (url.pathname === "/api/auth/extension-token" && request.method === "POST") {
    if (authMode(env) === "oauth") {
      const session = await requireOAuthSession(request, env);
      if (session instanceof Response) return session;
    }

    return json(env, {
      token: `ext_${crypto.randomUUID()}`,
      expires_in: 3600,
      token_type: "Bearer"
    });
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const sessionId = parseCookie(request, "annotated_session");
    if (env.SESSION_KV && sessionId) {
      await env.SESSION_KV.delete(`session:${sessionId}`);
    }

    return json(
      env,
      { ok: true },
      {
        headers: {
          "Set-Cookie": expiredSessionCookie(env)
        }
      },
      request
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
