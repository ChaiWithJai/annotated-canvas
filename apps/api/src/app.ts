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
import type {
  AuthProvider,
  Env,
  JobQueue,
  OAuthProviderClient,
  OAuthProviderProfile,
  OAuthProviderTokens,
  QueueJob,
  Repository
} from "./types";

interface Services {
  repository: Repository;
  jobs: JobQueue;
  oauth?: OAuthProviderClient;
}

interface OAuthState {
  provider: AuthProvider;
  return_to: string;
  code_verifier?: string;
}

interface AuthSession {
  session_id?: string;
  user_id: string;
  provider?: AuthProvider;
  handle?: string;
  display_name?: string;
  avatar_url?: string;
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
    jobs: new CloudflareJobQueue(env),
    oauth: new FetchOAuthProviderClient()
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
    !env.DB ? "DB" : null,
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
        return_to: parsed.return_to,
        code_verifier: typeof parsed.code_verifier === "string" ? parsed.code_verifier : undefined
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
      display_name: typeof parsed.display_name === "string" ? parsed.display_name : undefined,
      avatar_url: typeof parsed.avatar_url === "string" ? parsed.avatar_url : undefined
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

  return { ...session, session_id: sessionId };
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
    display_name: session.display_name ?? DEMO_USER.display_name,
    avatar_url: session.avatar_url
  };
}

function base64Url(bytes: ArrayBuffer): string {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createOAuthCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes.buffer);
}

export async function createOAuthCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(digest);
}

function normalizeHandle(value: string | undefined, fallback: string): string {
  const normalized = (value ?? fallback)
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return normalized.length > 0 ? normalized : fallback;
}

function sessionFromUser(user: PersistedOAuthUser, provider: AuthProvider): AuthSession {
  return {
    user_id: user.id,
    provider,
    handle: user.handle,
    display_name: user.display_name,
    avatar_url: user.avatar_url
  };
}

type PersistedOAuthUser = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
};

async function findUniqueHandle(db: D1Database, desiredHandle: string, userId?: string): Promise<string> {
  const baseHandle = normalizeHandle(desiredHandle, "annotated_user");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? baseHandle : `${baseHandle.slice(0, 18)}_${attempt + 1}`;
    const row = await db.prepare("SELECT id FROM users WHERE handle = ?").bind(candidate).first<{ id: string }>();
    if (!row || row.id === userId) return candidate;
  }

  return `${baseHandle.slice(0, 16)}_${crypto.randomUUID().slice(0, 8)}`;
}

async function upsertOAuthUser(env: Env, profile: OAuthProviderProfile): Promise<PersistedOAuthUser> {
  const fallbackHandle = `${profile.provider}_${profile.provider_account_id}`;
  if (!env.DB) {
    throw new Error("db_required");
  }

  const existing = await env.DB
    .prepare(
      `SELECT u.id, u.handle, u.display_name, u.avatar_url
       FROM oauth_accounts oa
       JOIN users u ON u.id = oa.user_id
       WHERE oa.provider = ? AND oa.provider_account_id = ?`
    )
    .bind(profile.provider, profile.provider_account_id)
    .first<{ id: string; handle: string; display_name: string; avatar_url: string | null }>();

  if (existing) {
    const handle = await findUniqueHandle(env.DB, normalizeHandle(profile.handle, existing.handle), existing.id);
    await env.DB
      .prepare("UPDATE users SET handle = ?, display_name = ?, avatar_url = ?, bio = ? WHERE id = ?")
      .bind(handle, profile.display_name, profile.avatar_url ?? null, profile.bio ?? null, existing.id)
      .run();
    return {
      id: existing.id,
      handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url
    };
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const handle = await findUniqueHandle(env.DB, normalizeHandle(profile.handle, fallbackHandle));
  await env.DB
    .prepare("INSERT INTO users (id, handle, display_name, avatar_url, bio) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, handle, profile.display_name, profile.avatar_url ?? null, profile.bio ?? null)
    .run();
  await env.DB
    .prepare("INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)")
    .bind(`oauth_${crypto.randomUUID()}`, userId, profile.provider, profile.provider_account_id)
    .run();

  return {
    id: userId,
    handle,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url
  };
}

async function persistSession(env: Env, sessionId: string, session: AuthSession, ttlSeconds: number): Promise<void> {
  if (!env.SESSION_KV) throw new Error("session_kv_required");

  await env.SESSION_KV.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: ttlSeconds });

  if (env.DB) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await env.DB
      .prepare("INSERT OR REPLACE INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, session.user_id, expiresAt)
      .run();
  }
}

async function deleteSession(env: Env, sessionId: string): Promise<void> {
  if (env.SESSION_KV) {
    await env.SESSION_KV.delete(`session:${sessionId}`);
  }
  if (env.DB) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
}

async function storeExtensionToken(env: Env, session: AuthSession): Promise<{ token: string; expires_in: number }> {
  const token = `ext_${crypto.randomUUID()}`;
  const expiresIn = 3600;
  if (env.SESSION_KV) {
    await env.SESSION_KV.put(
      `extension_token:${token}`,
      JSON.stringify({
        user_id: session.user_id,
        session_id: session.session_id,
        provider: session.provider,
        handle: session.handle,
        display_name: session.display_name
      }),
      { expirationTtl: expiresIn }
    );
  }

  return { token, expires_in: expiresIn };
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
    if (mode === "demo") {
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("return_to", returnTo);
      callbackUrl.searchParams.set("code", "demo");
    }
    const codeVerifier = mode === "oauth" ? createOAuthCodeVerifier() : undefined;
    const codeChallenge = codeVerifier ? await createOAuthCodeChallenge(codeVerifier) : undefined;

    if (env.SESSION_KV) {
      await env.SESSION_KV.put(
        `oauth_state:${state}`,
        JSON.stringify({ provider: provider.data, return_to: returnTo, code_verifier: codeVerifier }),
        { expirationTtl: 600 }
      );
    }

    const authorizationUrl =
      mode === "oauth" && credentials.clientId
        ? buildProviderAuthorizationUrl(provider.data, credentials.clientId, callbackUrl.toString(), state, codeChallenge)
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

      const missing = missingOAuthConfig(env, provider.data);
      if (missing.length > 0) {
        return oauthConfigError(env, request, provider.data, missing);
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

      const callbackUrl = new URL(`/api/auth/${provider.data}/callback`, url.origin);

      const credentials = getProviderCredentials(env, provider.data);
      const oauth = services.oauth ?? new FetchOAuthProviderClient();
      let profile: OAuthProviderProfile;
      try {
        const tokens = await oauth.exchangeCode({
          provider: provider.data,
          code,
          redirect_uri: callbackUrl.toString(),
          client_id: credentials.clientId ?? "",
          client_secret: credentials.clientSecret ?? "",
          code_verifier: storedState.code_verifier
        });
        profile = await oauth.fetchProfile(provider.data, tokens);
      } catch (caught) {
        return providerAuthError(env, request, provider.data, caught);
      }

      try {
        const user = await upsertOAuthUser(env, profile);
        const sessionId = `ses_${crypto.randomUUID()}`;
        const session = sessionFromUser(user, provider.data);
        await persistSession(env, sessionId, session, 60 * 60 * 24 * 14);

        return new Response(null, {
          status: 302,
          headers: {
            Location: storedState.return_to,
            "Set-Cookie": sessionCookie("annotated_session", sessionId, env, 1209600),
            ...corsHeaders(env, request)
          }
        });
      } catch {
        return error(env, 500, "oauth_session_failed", "OAuth session could not be created.", {
          provider: provider.data
        }, request);
      }
    }

    const sessionId = `ses_${crypto.randomUUID()}`;
    const session: AuthSession = {
      user_id: DEMO_USER.id,
      provider: provider.data,
      handle: DEMO_USER.handle,
      display_name: DEMO_USER.display_name
    };
    if (env.SESSION_KV) {
      await persistSession(env, sessionId, session, 60 * 60 * 24 * 14);
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
    let session: AuthSession = {
      user_id: DEMO_USER.id,
      provider: undefined,
      handle: DEMO_USER.handle,
      display_name: DEMO_USER.display_name
    };

    if (authMode(env) === "oauth") {
      const oauthSession = await requireOAuthSession(request, env);
      if (oauthSession instanceof Response) return oauthSession;
      session = oauthSession;
    }

    const token = await storeExtensionToken(env, session);
    return json(env, {
      token: token.token,
      expires_in: token.expires_in,
      token_type: "Bearer"
    });
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const sessionId = parseCookie(request, "annotated_session");
    if (sessionId) {
      await deleteSession(env, sessionId);
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

export function buildProviderAuthorizationUrl(
  provider: "x" | "google",
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge?: string
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
  if (codeChallenge) {
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
  }
  return authorizationUrl.toString();
}

class OAuthProviderError extends Error {
  constructor(
    message: string,
    readonly stage: "token" | "profile",
    readonly status?: number
  ) {
    super(message);
  }
}

function providerAuthError(env: Env, request: Request, provider: AuthProvider, caught: unknown): Response {
  if (caught instanceof OAuthProviderError) {
    return error(env, 502, "oauth_provider_error", "OAuth provider request failed.", {
      provider,
      stage: caught.stage,
      status: caught.status
    }, request);
  }

  return error(env, 502, "oauth_provider_error", "OAuth provider request failed.", { provider }, request);
}

function requireString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseGoogleProfile(value: unknown): OAuthProviderProfile | null {
  if (!isRecord(value)) return null;
  const sub = requireString(value.sub);
  const email = requireString(value.email);
  const displayName = requireString(value.name) ?? email;
  if (!sub || !displayName) return null;

  return {
    provider: "google",
    provider_account_id: sub,
    handle: email?.split("@")[0],
    display_name: displayName,
    avatar_url: requireString(value.picture) ?? undefined
  };
}

function parseXProfile(value: unknown): OAuthProviderProfile | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;
  const id = requireString(value.data.id);
  const displayName = requireString(value.data.name) ?? requireString(value.data.username);
  if (!id || !displayName) return null;

  return {
    provider: "x",
    provider_account_id: id,
    handle: requireString(value.data.username) ?? undefined,
    display_name: displayName,
    avatar_url: requireString(value.data.profile_image_url) ?? undefined,
    bio: requireString(value.data.description) ?? undefined
  };
}

async function parseJsonResponse(response: Response, stage: "token" | "profile"): Promise<unknown> {
  if (!response.ok) {
    throw new OAuthProviderError("provider_request_failed", stage, response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new OAuthProviderError("provider_invalid_json", stage, response.status);
  }
}

class FetchOAuthProviderClient implements OAuthProviderClient {
  async exchangeCode(input: {
    provider: AuthProvider;
    code: string;
    redirect_uri: string;
    client_id: string;
    client_secret: string;
    code_verifier?: string;
  }): Promise<OAuthProviderTokens> {
    const body = new URLSearchParams({
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirect_uri
    });

    let response: Response;
    if (input.provider === "google") {
      body.set("client_id", input.client_id);
      body.set("client_secret", input.client_secret);
      if (input.code_verifier) body.set("code_verifier", input.code_verifier);
      response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
    } else {
      if (input.code_verifier) body.set("code_verifier", input.code_verifier);
      response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${input.client_id}:${input.client_secret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
    }

    const parsed = await parseJsonResponse(response, "token");
    if (!isRecord(parsed) || typeof parsed.access_token !== "string" || parsed.access_token.length === 0) {
      throw new OAuthProviderError("token_missing", "token", response.status);
    }

    return {
      access_token: parsed.access_token,
      token_type: typeof parsed.token_type === "string" ? parsed.token_type : undefined,
      expires_in: typeof parsed.expires_in === "number" ? parsed.expires_in : undefined
    };
  }

  async fetchProfile(provider: AuthProvider, tokens: OAuthProviderTokens): Promise<OAuthProviderProfile> {
    const url =
      provider === "google"
        ? "https://openidconnect.googleapis.com/v1/userinfo"
        : "https://api.twitter.com/2/users/me?user.fields=profile_image_url,description";
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    const parsed = await parseJsonResponse(response, "profile");
    const profile = provider === "google" ? parseGoogleProfile(parsed) : parseXProfile(parsed);
    if (!profile) {
      throw new OAuthProviderError("profile_invalid", "profile", response.status);
    }

    return profile;
  }
}
