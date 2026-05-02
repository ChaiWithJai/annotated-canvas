// @vitest-environment node
import {
  AUDIO_COMMENTARY_MAX_BYTES,
  AudioCommentaryUploadResponseSchema,
  OwnedVideoUploadIntentResponseSchema,
  fixtures
} from "@annotated/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { buildProviderAuthorizationUrl, createOAuthCodeChallenge, handleRequest } from "./app";
import { InMemoryRepository } from "./repository";
import { RecordingJobQueue } from "./queue";
import type { Env, OAuthProviderClient, OAuthProviderProfile, OAuthProviderTokens } from "./types";

const env: Env = {
  APP_ORIGIN: "http://localhost:5173",
  SERVICE_MODE: "test"
};

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://api.annotated.test${path}`, init);
}

async function body(response: Response) {
  return response.json() as Promise<Record<string, any>>;
}

function createSessionKv(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  const kv = {
    async get(key: string, type?: "text" | "json" | "arrayBuffer" | "stream") {
      const value = store.get(key) ?? null;
      if (value === null) return null;
      if (type === "arrayBuffer") {
        return new TextEncoder().encode(value).buffer;
      }
      if (type === "json") {
        return JSON.parse(value);
      }
      return value;
    },
    async put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream) {
      if (typeof value === "string") {
        store.set(key, value);
      } else if (value instanceof ArrayBuffer) {
        store.set(key, new TextDecoder().decode(value));
      } else if (ArrayBuffer.isView(value)) {
        store.set(key, new TextDecoder().decode(value));
      } else {
        store.set(key, String(value));
      }
    },
    async delete(key: string) {
      store.delete(key);
    }
  };

  return Object.assign(kv, { store }) as unknown as KVNamespace & { store: Map<string, string> };
}

function createAuthDb() {
  const users = new Map<string, any>();
  const oauthAccounts = new Map<string, any>();
  const sessions = new Map<string, any>();

  const db = {
    users,
    oauthAccounts,
    sessions,
    prepare(sql: string) {
      let bindings: any[] = [];
      return {
        bind(...values: any[]) {
          bindings = values;
          return this;
        },
        async first() {
          if (sql.includes("FROM oauth_accounts")) {
            const [provider, providerAccountId] = bindings;
            const account = Array.from(oauthAccounts.values()).find(
              (item) => item.provider === provider && item.provider_account_id === providerAccountId
            );
            if (!account) return null;
            return users.get(account.user_id) ?? null;
          }

          if (sql.includes("SELECT id FROM users WHERE handle = ?")) {
            const [handle] = bindings;
            return Array.from(users.values()).find((item) => item.handle === handle) ?? null;
          }

          return null;
        },
        async run() {
          if (sql.startsWith("INSERT INTO users")) {
            const [id, handle, displayName, avatarUrl, bio] = bindings;
            users.set(id, {
              id,
              handle,
              display_name: displayName,
              avatar_url: avatarUrl,
              bio
            });
          } else if (sql.startsWith("UPDATE users SET")) {
            const [handle, displayName, avatarUrl, bio, id] = bindings;
            const existing = users.get(id);
            users.set(id, {
              ...existing,
              id,
              handle,
              display_name: displayName,
              avatar_url: avatarUrl,
              bio
            });
          } else if (sql.startsWith("INSERT INTO oauth_accounts")) {
            const [id, userId, provider, providerAccountId] = bindings;
            oauthAccounts.set(id, {
              id,
              user_id: userId,
              provider,
              provider_account_id: providerAccountId
            });
          } else if (sql.startsWith("INSERT OR REPLACE INTO sessions")) {
            const [id, userId, expiresAt] = bindings;
            sessions.set(id, {
              id,
              user_id: userId,
              expires_at: expiresAt
            });
          } else if (sql.startsWith("DELETE FROM sessions")) {
            sessions.delete(bindings[0]);
          }
          return { success: true };
        }
      };
    }
  };

  return db as unknown as D1Database & {
    users: Map<string, any>;
    oauthAccounts: Map<string, any>;
    sessions: Map<string, any>;
  };
}

function createOAuthClient(profile: OAuthProviderProfile, tokens: OAuthProviderTokens = { access_token: "provider-token" }) {
  const calls: Array<{ type: "exchange"; input: any } | { type: "profile"; provider: string; tokens: OAuthProviderTokens }> = [];
  const client: OAuthProviderClient & { calls: typeof calls } = {
    calls,
    async exchangeCode(input) {
      calls.push({ type: "exchange", input });
      return tokens;
    },
    async fetchProfile(provider, fetchedTokens) {
      calls.push({ type: "profile", provider, tokens: fetchedTokens });
      return profile;
    }
  };
  return client;
}

describe("API router regression coverage", () => {
  let repository: InMemoryRepository;
  let jobs: RecordingJobQueue;

  beforeEach(() => {
    repository = new InMemoryRepository(undefined, env.APP_ORIGIN);
    jobs = new RecordingJobQueue();
  });

  it("serves p50 health and feed routes", async () => {
    const health = await handleRequest(request("/api/health"), env, { repository, jobs });
    const feed = await handleRequest(request("/api/feed"), env, { repository, jobs });

    expect(health.status).toBe(200);
    expect((await body(feed)).items).toHaveLength(3);
  });

  it("builds provider authorization URLs with PKCE and provider scopes", async () => {
    const challenge = await createOAuthCodeChallenge("test-verifier");
    const googleUrl = new URL(
      buildProviderAuthorizationUrl(
        "google",
        "google-client",
        "https://api.annotated.test/api/auth/google/callback?state=state_1&return_to=http%3A%2F%2Flocalhost%3A5173%2F",
        "state_1",
        challenge
      )
    );
    const xUrl = new URL(
      buildProviderAuthorizationUrl(
        "x",
        "x-client",
        "https://api.annotated.test/api/auth/x/callback?state=state_2&return_to=http%3A%2F%2Flocalhost%3A5173%2F",
        "state_2",
        challenge
      )
    );

    expect(googleUrl.origin).toBe("https://accounts.google.com");
    expect(googleUrl.searchParams.get("scope")).toBe("openid email profile");
    expect(googleUrl.searchParams.get("code_challenge")).toBe(challenge);
    expect(googleUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(xUrl.origin).toBe("https://twitter.com");
    expect(xUrl.searchParams.get("scope")).toBe("users.read tweet.read");
  });

  it("serves p50 auth start, callback, and extension-token routes", async () => {
    const start = await handleRequest(request("/api/auth/google/start?return_to=/"), env, { repository, jobs });
    const startPayload = await body(start);

    expect(start.status).toBe(200);
    expect(startPayload.provider).toBe("google");
    expect(startPayload.mode).toBe("demo");

    const callback = await handleRequest(
      request(`/api/auth/google/callback?state=${startPayload.state}&code=demo&return_to=/`),
      env,
      { repository, jobs }
    );
    expect(callback.status).toBe(302);
    expect(callback.headers.get("Set-Cookie")).toContain("annotated_session=");

    const token = await handleRequest(
      request("/api/auth/extension-token", {
        method: "POST"
      }),
      env,
      { repository, jobs }
    );
    expect((await body(token)).token_type).toBe("Bearer");
  });

  it("fails closed for oauth start when credentials, D1, or session KV are missing", async () => {
    const missingSecret = await handleRequest(
      request("/api/auth/google/start?return_to=/"),
      {
        ...env,
        AUTH_MODE: "oauth",
        GOOGLE_CLIENT_ID: "google-client",
        SESSION_KV: createSessionKv(),
        DB: createAuthDb()
      },
      { repository, jobs }
    );
    const missingSecretPayload = await body(missingSecret);

    expect(missingSecret.status).toBe(503);
    expect(missingSecretPayload.error.code).toBe("auth_not_configured");
    expect(missingSecretPayload.error.details.missing).toContain("GOOGLE_CLIENT_SECRET");
    expect(missingSecretPayload.authorization_url).toBeUndefined();

    const missingDb = await handleRequest(
      request("/api/auth/google/start?return_to=/"),
      {
        ...env,
        AUTH_MODE: "oauth",
        GOOGLE_CLIENT_ID: "google-client",
        GOOGLE_CLIENT_SECRET: "google-secret",
        SESSION_KV: createSessionKv()
      },
      { repository, jobs }
    );
    const missingDbPayload = await body(missingDb);

    expect(missingDb.status).toBe(503);
    expect(missingDbPayload.error.code).toBe("auth_not_configured");
    expect(missingDbPayload.error.details.missing).toContain("DB");
    expect(missingDbPayload.authorization_url).toBeUndefined();

    const missingKv = await handleRequest(
      request("/api/auth/x/start?return_to=/"),
      {
        ...env,
        AUTH_MODE: "oauth",
        X_CLIENT_ID: "x-client",
        X_CLIENT_SECRET: "x-secret",
        DB: createAuthDb()
      },
      { repository, jobs }
    );
    const missingKvPayload = await body(missingKv);

    expect(missingKv.status).toBe(503);
    expect(missingKvPayload.error.code).toBe("auth_not_configured");
    expect(missingKvPayload.error.details.missing).toContain("SESSION_KV");
    expect(missingKvPayload.authorization_url).toBeUndefined();
  });

  it("rejects unsupported auth providers before start or callback handling", async () => {
    const start = await handleRequest(request("/api/auth/mastodon/start?return_to=/"), env, { repository, jobs });
    const callback = await handleRequest(request("/api/auth/mastodon/callback?state=state_1&code=demo"), env, {
      repository,
      jobs
    });

    expect(start.status).toBe(400);
    expect((await body(start)).error.code).toBe("unsupported_auth_provider");
    expect(callback.status).toBe(400);
    expect((await body(callback)).error.code).toBe("unsupported_auth_provider");
  });

  it("validates state, exchanges provider code, persists local user and session, and rejects replay", async () => {
    const sessionKv = createSessionKv();
    const db = createAuthDb();
    const oauth = createOAuthClient({
      provider: "google",
      provider_account_id: "google-user-123",
      handle: "mira.oauth",
      display_name: "Mira OAuth",
      avatar_url: "https://profiles.example/mira.png"
    });
    const oauthEnv: Env = {
      ...env,
      AUTH_MODE: "oauth",
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
      SESSION_KV: sessionKv,
      DB: db
    };

    const start = await body(
      await handleRequest(request("/api/auth/google/start?return_to=/after-auth"), oauthEnv, { repository, jobs })
    );
    expect(start.authorization_url).toContain("accounts.google.com");
    expect(start.authorization_url).toContain("code_challenge=");
    expect(sessionKv.store.has(`oauth_state:${start.state}`)).toBe(true);

    const missingCode = await handleRequest(request(`/api/auth/google/callback?state=${start.state}`), oauthEnv, {
      repository,
      jobs
    });
    expect(missingCode.status).toBe(400);
    expect((await body(missingCode)).error.code).toBe("oauth_code_required");
    expect(sessionKv.store.has(`oauth_state:${start.state}`)).toBe(true);

    const invalidState = await handleRequest(request("/api/auth/google/callback?state=missing&code=auth-code"), oauthEnv, {
      repository,
      jobs
    });
    expect(invalidState.status).toBe(400);
    expect((await body(invalidState)).error.code).toBe("invalid_oauth_state");

    const firstCallback = await handleRequest(
      request(`/api/auth/google/callback?state=${start.state}&code=auth-code`),
      oauthEnv,
      { repository, jobs, oauth }
    );
    expect(firstCallback.status).toBe(302);
    expect(firstCallback.headers.get("Location")).toBe("http://localhost:5173/after-auth");
    expect(firstCallback.headers.get("Set-Cookie")).toContain("annotated_session=");
    expect(sessionKv.store.has(`oauth_state:${start.state}`)).toBe(false);
    expect(db.users.size).toBe(1);
    expect(db.oauthAccounts.size).toBe(1);
    expect(db.sessions.size).toBe(1);

    const exchangeCall = oauth.calls.find(
      (call): call is { type: "exchange"; input: any } => call.type === "exchange"
    );
    expect(exchangeCall?.input).toMatchObject({
      provider: "google",
      code: "auth-code",
      client_id: "google-client",
      client_secret: "google-secret"
    });
    expect(exchangeCall?.input.redirect_uri).toBe("https://api.annotated.test/api/auth/google/callback");
    expect(exchangeCall?.input.code_verifier).toEqual(expect.any(String));

    const sessionId = firstCallback.headers.get("Set-Cookie")?.match(/annotated_session=([^;]+)/)?.[1];
    expect(sessionId).toBeTruthy();
    const me = await handleRequest(
      request("/api/me", {
        headers: {
          Cookie: `annotated_session=${sessionId}`
        }
      }),
      oauthEnv,
      { repository, jobs }
    );
    expect(me.status).toBe(200);
    expect((await body(me)).user).toMatchObject({
      handle: "mira_oauth",
      display_name: "Mira OAuth"
    });

    const replayedCallback = await handleRequest(
      request(`/api/auth/google/callback?state=${start.state}&code=auth-code`),
      oauthEnv,
      { repository, jobs, oauth }
    );
    expect(replayedCallback.status).toBe(400);
    expect((await body(replayedCallback)).error.code).toBe("invalid_oauth_state");
  });

  it("serves p50 X oauth callback and ties extension handoff to the web session", async () => {
    const sessionKv = createSessionKv();
    const db = createAuthDb();
    const oauth = createOAuthClient({
      provider: "x",
      provider_account_id: "x-user-456",
      handle: "annotator_x",
      display_name: "Annotator X",
      avatar_url: "https://profiles.example/x.png"
    });
    const oauthEnv: Env = {
      ...env,
      AUTH_MODE: "oauth",
      X_CLIENT_ID: "x-client",
      X_CLIENT_SECRET: "x-secret",
      SESSION_KV: sessionKv,
      DB: db
    };

    const start = await body(
      await handleRequest(request("/api/auth/x/start?return_to=/extension"), oauthEnv, { repository, jobs })
    );
    expect(start.authorization_url).toContain("twitter.com");

    const callback = await handleRequest(request(`/api/auth/x/callback?state=${start.state}&code=x-code`), oauthEnv, {
      repository,
      jobs,
      oauth
    });
    expect(callback.status).toBe(302);
    expect(callback.headers.get("Location")).toBe("http://localhost:5173/extension");
    expect(db.users.size).toBe(1);
    expect(db.oauthAccounts.size).toBe(1);
    expect(db.sessions.size).toBe(1);

    const sessionId = callback.headers.get("Set-Cookie")?.match(/annotated_session=([^;]+)/)?.[1];
    expect(sessionId).toBeTruthy();
    const token = await handleRequest(
      request("/api/auth/extension-token", {
        method: "POST",
        headers: {
          Cookie: `annotated_session=${sessionId}`
        }
      }),
      oauthEnv,
      { repository, jobs }
    );
    expect(token.status).toBe(200);
    const tokenPayload = await body(token);
    const storedToken = JSON.parse(sessionKv.store.get(`extension_token:${tokenPayload.token}`) ?? "{}");
    expect(storedToken).toMatchObject({
      session_id: sessionId,
      provider: "x",
      handle: "annotator_x",
      display_name: "Annotator X"
    });

    const exchangeCall = oauth.calls.find(
      (call): call is { type: "exchange"; input: any } => call.type === "exchange"
    );
    expect(exchangeCall?.input).toMatchObject({
      provider: "x",
      code: "x-code",
      client_id: "x-client",
      client_secret: "x-secret"
    });
    expect(exchangeCall?.input.redirect_uri).toBe("https://api.annotated.test/api/auth/x/callback");
    expect(exchangeCall?.input.code_verifier).toEqual(expect.any(String));
  });

  it("fails oauth callback closed for missing config without consuming state", async () => {
    const sessionKv = createSessionKv({
      "oauth_state:state_missing_secret": JSON.stringify({
        provider: "x",
        return_to: "http://localhost:5173/"
      })
    });
    const response = await handleRequest(
      request("/api/auth/x/callback?state=state_missing_secret&code=auth-code"),
      {
        ...env,
        AUTH_MODE: "oauth",
        X_CLIENT_ID: "x-client",
        SESSION_KV: sessionKv
      },
      { repository, jobs }
    );

    expect(response.status).toBe(503);
    expect((await body(response)).error.code).toBe("auth_not_configured");
    expect(sessionKv.store.has("oauth_state:state_missing_secret")).toBe(true);
  });

  it("consumes valid state and reports provider failures without creating a session", async () => {
    const sessionKv = createSessionKv();
    const oauthEnv: Env = {
      ...env,
      AUTH_MODE: "oauth",
      X_CLIENT_ID: "x-client",
      X_CLIENT_SECRET: "x-secret",
      SESSION_KV: sessionKv,
      DB: createAuthDb()
    };
    const failingOAuth: OAuthProviderClient = {
      async exchangeCode() {
        throw new Error("provider_unavailable");
      },
      async fetchProfile() {
        throw new Error("unreachable");
      }
    };

    const start = await body(await handleRequest(request("/api/auth/x/start?return_to=/"), oauthEnv, { repository, jobs }));
    const response = await handleRequest(
      request(`/api/auth/x/callback?state=${start.state}&code=auth-code`),
      oauthEnv,
      { repository, jobs, oauth: failingOAuth }
    );
    const payload = await body(response);

    expect(response.status).toBe(502);
    expect(payload.error.code).toBe("oauth_provider_error");
    expect(sessionKv.store.has(`oauth_state:${start.state}`)).toBe(false);
    expect(Array.from(sessionKv.store.keys()).some((key) => key.startsWith("session:"))).toBe(false);
  });

  it("requires a valid oauth session for me and extension-token", async () => {
    const sessionKv = createSessionKv({
      "session:ses_valid": JSON.stringify({
        user_id: "usr_oauth",
        provider: "google",
        handle: "oauth-user",
        display_name: "OAuth User"
      })
    });
    const oauthEnv: Env = {
      ...env,
      AUTH_MODE: "oauth",
      SESSION_KV: sessionKv
    };

    const missingMe = await handleRequest(request("/api/me"), oauthEnv, { repository, jobs });
    expect(missingMe.status).toBe(401);
    expect((await body(missingMe)).error.code).toBe("authentication_required");

    const validMe = await handleRequest(
      request("/api/me", {
        headers: {
          Cookie: "annotated_session=ses_valid",
          Origin: "http://localhost:5173"
        }
      }),
      oauthEnv,
      { repository, jobs }
    );
    expect(validMe.status).toBe(200);
    expect(validMe.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    expect(validMe.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect((await body(validMe)).user).toMatchObject({
      id: "usr_oauth",
      handle: "oauth-user",
      display_name: "OAuth User"
    });

    const deniedToken = await handleRequest(
      request("/api/auth/extension-token", {
        method: "POST"
      }),
      oauthEnv,
      { repository, jobs }
    );
    expect(deniedToken.status).toBe(401);

    const token = await handleRequest(
      request("/api/auth/extension-token", {
        method: "POST",
        headers: {
          Cookie: "annotated_session=ses_valid"
        }
      }),
      oauthEnv,
      { repository, jobs }
    );
    expect(token.status).toBe(200);
    const tokenPayload = await body(token);
    expect(tokenPayload.token_type).toBe("Bearer");
    expect(sessionKv.store.has(`extension_token:${tokenPayload.token}`)).toBe(true);
    expect(JSON.parse(sessionKv.store.get(`extension_token:${tokenPayload.token}`) ?? "{}")).toMatchObject({
      user_id: "usr_oauth",
      provider: "google",
      session_id: "ses_valid"
    });
  });

  it("accepts a bearer extension token for /api/me and attributes extension publishes to that user", async () => {
    const sessionKv = createSessionKv({
      "extension_token:ext_valid": JSON.stringify({
        user_id: "usr_oauth",
        provider: "google",
        session_id: "ses_valid",
        handle: "oauth-user",
        display_name: "OAuth User"
      })
    });
    const oauthEnv: Env = {
      ...env,
      AUTH_MODE: "oauth",
      SESSION_KV: sessionKv
    };

    const me = await handleRequest(
      request("/api/me", {
        headers: {
          Authorization: "Bearer ext_valid"
        }
      }),
      oauthEnv,
      { repository, jobs }
    );
    expect(me.status).toBe(200);
    expect((await body(me)).user).toMatchObject({
      id: "usr_oauth",
      handle: "oauth-user"
    });

    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-extension-auth",
          Authorization: "Bearer ext_valid"
        },
        body: JSON.stringify({
          clip: fixtures.annotations[1].clip,
          commentary: { kind: "text", text: "Authenticated extension publish." },
          visibility: "public",
          client_context: { surface: "extension", capture_method: "selection" }
        })
      }),
      oauthEnv,
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(201);
    expect(payload.annotation.author).toMatchObject({
      id: "usr_oauth",
      handle: "oauth-user",
      display_name: "OAuth User"
    });
  });

  it("deletes the session on logout when session KV is available", async () => {
    const sessionKv = createSessionKv({
      "session:ses_valid": JSON.stringify({
        user_id: "usr_oauth",
        provider: "google"
      })
    });

    const response = await handleRequest(
      request("/api/auth/logout", {
        method: "POST",
        headers: {
          Cookie: "annotated_session=ses_valid"
        }
      }),
      {
        ...env,
        AUTH_MODE: "oauth",
        SESSION_KV: sessionKv
      },
      { repository, jobs }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(sessionKv.store.has("session:ses_valid")).toBe(false);
  });

  it("uses production-safe cookies and rejects open redirect return_to values", async () => {
    const productionEnv: Env = {
      ...env,
      APP_ORIGIN: "https://annotated-canvas.pages.dev",
      SESSION_KV: createSessionKv()
    };

    const start = await body(
      await handleRequest(
        request("/api/auth/google/start?return_to=https://attacker.example/after-auth"),
        productionEnv,
        { repository, jobs }
      )
    );
    expect(start.authorization_url).toContain("return_to=https%3A%2F%2Fannotated-canvas.pages.dev");

    const callback = await handleRequest(
      request(`/api/auth/google/callback?state=${start.state}&code=demo&return_to=https://attacker.example/after-auth`),
      productionEnv,
      { repository, jobs }
    );

    expect(callback.status).toBe(302);
    expect(callback.headers.get("Location")).toBe("https://annotated-canvas.pages.dev");
    expect(callback.headers.get("Set-Cookie")).toContain("SameSite=None; Secure");
  });

  it("allows chrome-extension return_to URLs for extension OAuth handoff without opening arbitrary web redirects", async () => {
    const productionEnv: Env = {
      ...env,
      APP_ORIGIN: "https://annotated-canvas.pages.dev",
      SESSION_KV: createSessionKv()
    };

    const start = await body(
      await handleRequest(
        request("/api/auth/google/start?return_to=chrome-extension://extension-id/sidepanel.html?auth=1"),
        productionEnv,
        { repository, jobs }
      )
    );
    expect(start.authorization_url).toContain("return_to=chrome-extension%3A%2F%2Fextension-id%2Fsidepanel.html%3Fauth%3D1");
  });

  it("serves p50 user profile, annotations, and follow contract routes", async () => {
    const profile = await body(await handleRequest(request("/api/users/ren"), env, { repository, jobs }));
    expect(profile.user.handle).toBe("ren");

    const annotations = await body(
      await handleRequest(request("/api/users/ren/annotations"), env, { repository, jobs })
    );
    expect(annotations.items[0].author.handle).toBe("ren");

    const followed = await body(
      await handleRequest(
        request("/api/follows/usr_ren", {
          method: "PUT"
        }),
        env,
        { repository, jobs }
      )
    );
    expect(followed.user.viewer_is_following).toBe(true);
  });

  it("publishes a p50 text annotation and enqueues feed fanout", async () => {
    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-1"
        },
        body: JSON.stringify({
          clip: fixtures.annotations[1].clip,
          commentary: { kind: "text", text: "This quote carries the product principle." },
          visibility: "public",
          client_context: { surface: "web", capture_method: "selection" }
        })
      }),
      env,
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(201);
    expect(payload.annotation.clip.kind).toBe("text");
    expect(payload.annotation.permalink_url).toBe(`${env.APP_ORIGIN}/a/${payload.annotation.id}`);
    expect(jobs.jobs[0]).toMatchObject({ type: "feed_fanout", annotation_id: payload.annotation.id });
  });

  it("keeps p95 publish retries idempotent", async () => {
    const init: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "publish-key-retry"
      },
      body: JSON.stringify({
        clip: fixtures.annotations[0].clip,
        commentary: { kind: "text", text: "Retry-safe publish." },
        visibility: "public",
        client_context: { surface: "extension", capture_method: "media-timecode" }
      })
    };

    const first = await body(await handleRequest(request("/api/annotations", init), env, { repository, jobs }));
    const second = await body(await handleRequest(request("/api/annotations", init), env, { repository, jobs }));

    expect(second.annotation.id).toBe(first.annotation.id);
  });

  it("rejects p95 annotations missing source attribution", async () => {
    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-missing-source"
        },
        body: JSON.stringify({
          clip: { kind: "text", text: { quote: "orphan quote" } },
          commentary: { kind: "text", text: "Should fail." },
          visibility: "public",
          client_context: { surface: "web", capture_method: "selection" }
        })
      }),
      env,
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("invalid_annotation");
  });

  it("rejects p95 media clips above the 90 second cap", async () => {
    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-long-video"
        },
        body: JSON.stringify({
          clip: {
            kind: "video",
            source: fixtures.sources.youtube,
            media: {
              start_seconds: 0,
              end_seconds: 180,
              duration_seconds: 180
            }
          },
          commentary: { kind: "text", text: "Too long." },
          visibility: "public",
          client_context: { surface: "extension", capture_method: "media-timecode" }
        })
      }),
      env,
      { repository, jobs }
    );

    expect(response.status).toBe(400);
  });

  it("rejects p95 audio commentary without an uploaded audio asset id", async () => {
    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-missing-audio-asset"
        },
        body: JSON.stringify({
          clip: fixtures.annotations[0].clip,
          commentary: {
            kind: "audio",
            text: "Missing upload metadata should fail."
          },
          visibility: "public",
          client_context: { surface: "extension", capture_method: "media-timecode" }
        })
      }),
      env,
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("invalid_annotation");
  });

  it("returns a truthful audio upload intent when durable media storage is unbound", async () => {
    const response = await handleRequest(
      request("/api/uploads/audio-commentary", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm"
        },
        body: "audio-bytes"
      }),
      env,
      { repository, jobs }
    );

    const payload = await body(response);
    const upload = AudioCommentaryUploadResponseSchema.parse(payload.upload);
    expect(response.status).toBe(200);
    expect(upload.status).toBe("intent-created");
    expect(upload.storage).toBe("kv");
    expect(upload.max_bytes).toBe(AUDIO_COMMENTARY_MAX_BYTES);
    expect(upload.kv_key).toMatch(/^media_blob:upl_.+/);
  });

  it("stores audio commentary durably in KV when R2 is unavailable", async () => {
    const sessionKv = createSessionKv();
    const response = await handleRequest(
      request("/api/uploads/audio-commentary", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm"
        },
        body: "audio-bytes"
      }),
      { ...env, SESSION_KV: sessionKv },
      { repository, jobs }
    );

    const payload = await body(response);
    const upload = AudioCommentaryUploadResponseSchema.parse(payload.upload);
    expect(response.status).toBe(200);
    expect(upload.status).toBe("stored");
    expect(upload.storage).toBe("kv");
    expect(upload.byte_length).toBeGreaterThan(0);
    expect(await sessionKv.get(`media_asset:${upload.asset_id}`)).toContain("\"status\":\"stored\"");
  });

  it("serves stored KV audio commentary bytes by asset id", async () => {
    const sessionKv = createSessionKv();
    const uploadResponse = await handleRequest(
      request("/api/uploads/audio-commentary", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm"
        },
        body: "audio-bytes"
      }),
      { ...env, SESSION_KV: sessionKv },
      { repository, jobs }
    );
    const upload = AudioCommentaryUploadResponseSchema.parse((await body(uploadResponse)).upload);

    const response = await handleRequest(
      request(`/api/uploads/audio-commentary/${upload.asset_id}`),
      { ...env, SESSION_KV: sessionKv },
      { repository, jobs }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/webm");
    expect(await response.text()).toBe("audio-bytes");
  });

  it("rejects unsupported audio commentary content types", async () => {
    const response = await handleRequest(
      request("/api/uploads/audio-commentary", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain"
        },
        body: "not-audio"
      }),
      { ...env, SESSION_KV: createSessionKv() },
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(415);
    expect(payload.error.code).toBe("unsupported_audio_type");
  });

  it("rejects arbitrary audio asset ids before annotation publish", async () => {
    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-unknown-audio-asset"
        },
        body: JSON.stringify({
          clip: fixtures.annotations[0].clip,
          commentary: {
            kind: "audio",
            text: "Unknown upload metadata should fail.",
            audio_asset_id: "upl_missing"
          },
          visibility: "public",
          client_context: { surface: "extension", capture_method: "media-timecode" }
        })
      }),
      { ...env, SESSION_KV: createSessionKv() },
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("audio_asset_not_found");
  });

  it("rejects unfinalized audio asset metadata before annotation publish", async () => {
    const sessionKv = createSessionKv({
      "media_asset:upl_incomplete": JSON.stringify({
        id: "upl_incomplete",
        asset_id: "upl_incomplete",
        kind: "audio-commentary",
        storage: "kv",
        kv_key: "media_blob:upl_incomplete",
        max_bytes: AUDIO_COMMENTARY_MAX_BYTES,
        status: "stored"
      })
    });

    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-unfinalized-audio-asset"
        },
        body: JSON.stringify({
          clip: fixtures.annotations[0].clip,
          commentary: {
            kind: "audio",
            text: "Incomplete upload metadata should fail.",
            audio_asset_id: "upl_incomplete"
          },
          visibility: "public",
          client_context: { surface: "extension", capture_method: "media-timecode" }
        })
      }),
      { ...env, SESSION_KV: sessionKv },
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("audio_asset_not_finalized");
  });

  it("publishes audio commentary after the uploaded asset is stored", async () => {
    const sessionKv = createSessionKv();
    const uploadResponse = await handleRequest(
      request("/api/uploads/audio-commentary", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm"
        },
        body: "audio-bytes"
      }),
      { ...env, SESSION_KV: sessionKv },
      { repository, jobs }
    );
    const upload = AudioCommentaryUploadResponseSchema.parse((await body(uploadResponse)).upload);

    const response = await handleRequest(
      request("/api/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "publish-key-known-audio-asset"
        },
        body: JSON.stringify({
          clip: fixtures.annotations[0].clip,
          commentary: {
            kind: "audio",
            text: "Stored audio commentary.",
            audio_asset_id: upload.asset_id
          },
          visibility: "public",
          client_context: { surface: "extension", capture_method: "media-timecode" }
        })
      }),
      { ...env, SESSION_KV: sessionKv },
      { repository, jobs }
    );

    const payload = await body(response);
    expect(response.status).toBe(201);
    expect(payload.annotation.commentary).toMatchObject({
      kind: "audio",
      audio_asset_id: upload.asset_id
    });
  });

  it("keeps owned-video uploads as intent-only until 240p processing is implemented", async () => {
    const response = await handleRequest(
      request("/api/uploads/owned-video", {
        method: "POST",
        headers: {
          "Content-Type": "video/mp4"
        },
        body: "video-bytes"
      }),
      env,
      { repository, jobs }
    );

    const payload = await body(response);
    const upload = OwnedVideoUploadIntentResponseSchema.parse(payload.upload);
    expect(response.status).toBe(200);
    expect(upload.status).toBe("intent-created");
    expect("max_height_pixels" in payload.upload).toBe(false);
  });

  it("treats p95 claim filing as notice intake without removing content", async () => {
    const response = await handleRequest(
      request("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "claim-key-1"
        },
        body: JSON.stringify({
          annotation_id: "ann_video_minimalism",
          claimant_name: "Rights Holder",
          claimant_email: "rights@example.com",
          relationship: "copyright-owner",
          reason:
            "I own this source and want the annotation reviewed for attribution and fair-use boundaries.",
          requested_action: "review"
        })
      }),
      env,
      { repository, jobs }
    );

    const claim = await body(response);
    const annotation = await body(
      await handleRequest(request("/api/annotations/ann_video_minimalism"), env, { repository, jobs })
    );

    expect(response.status).toBe(202);
    expect(claim.claim.status).toBe("open");
    expect(annotation.annotation.id).toBe("ann_video_minimalism");
    expect(jobs.jobs[0]).toMatchObject({ type: "claim_notice", claim_id: claim.claim.id });
  });

  it("creates and lists p50 comments on a public annotation", async () => {
    const created = await handleRequest(
      request("/api/annotations/ann_video_minimalism/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "comment-key-1"
        },
        body: JSON.stringify({
          body: "This is a useful discussion note tied to the source moment."
        })
      }),
      env,
      { repository, jobs }
    );
    expect(created.status).toBe(201);

    const payload = await body(created);
    expect(payload.comment.annotation_id).toBe("ann_video_minimalism");

    const listed = await body(
      await handleRequest(request("/api/annotations/ann_video_minimalism/comments"), env, { repository, jobs })
    );
    expect(listed.items.some((item: any) => item.id === payload.comment.id)).toBe(true);

    const annotation = await body(
      await handleRequest(request("/api/annotations/ann_video_minimalism"), env, { repository, jobs })
    );
    expect(annotation.annotation.engagement.discussions).toBeGreaterThan(6);
  });

  it("keeps p95 comment retries idempotent", async () => {
    const init: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "comment-key-retry"
      },
      body: JSON.stringify({
        body: "Retry-safe comment creation."
      })
    };

    const first = await body(
      await handleRequest(request("/api/annotations/ann_text_density/comments", init), env, { repository, jobs })
    );
    const second = await body(
      await handleRequest(request("/api/annotations/ann_text_density/comments", init), env, { repository, jobs })
    );

    expect(second.comment.id).toBe(first.comment.id);
  });

  it("rejects p95 comments on unknown annotations", async () => {
    const response = await handleRequest(
      request("/api/annotations/missing/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "comment-key-missing"
        },
        body: JSON.stringify({
          body: "This cannot attach to anything."
        })
      }),
      env,
      { repository, jobs }
    );

    expect(response.status).toBe(404);
  });

  it("serves claim status and records p50 claim events", async () => {
    const created = await body(
      await handleRequest(
        request("/api/claims", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "claim-key-status"
          },
          body: JSON.stringify({
            annotation_id: "ann_video_minimalism",
            claimant_name: "Rights Holder",
            claimant_email: "rights@example.com",
            relationship: "copyright-owner",
            reason:
              "I own this source and want the annotation reviewed for attribution and fair-use boundaries.",
            requested_action: "review"
          })
        }),
        env,
        { repository, jobs }
      )
    );

    const eventResponse = await handleRequest(
      request(`/api/claims/${created.claim.id}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_type: "status-change",
          body: "Moderator requested more information.",
          status: "needs_info"
        })
      }),
      env,
      { repository, jobs }
    );
    expect(eventResponse.status).toBe(201);

    const status = await body(await handleRequest(request(`/api/claims/${created.claim.id}`), env, { repository, jobs }));
    expect(status.claim.status).toBe("needs_info");
    expect(status.events).toHaveLength(1);
  });
});
