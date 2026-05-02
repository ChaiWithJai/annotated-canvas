import {
  AnnotationCreateSchema,
  AnnotationResourceSchema,
  SourceRefSchema,
  toSourceDomain,
  type AnnotationResource
} from "@annotated/contracts";

export const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
export const PRODUCTION_API_BASE = "https://annotated-canvas-api.jaybhagat841.workers.dev";
const API_BASE_STORAGE_KEY = "apiBaseUrl";
const AUTH_TOKEN_STORAGE_KEY = "authToken";
const AUTH_USER_STORAGE_KEY = "authUser";
const PENDING_CAPTURE_STORAGE_KEY = "pendingCapture";
const CAPTURE_DRAFT_STORAGE_KEY = "captureDraft";

export interface PageCaptureContext {
  source_url?: string;
  title?: string;
  selection_text?: string;
  media?: {
    current_time?: number;
    duration?: number;
    kind?: "audio" | "video";
  };
}

export interface PublishOptions {
  context: PageCaptureContext;
  commentary: string;
  captureKind: "text" | "video";
  range?: {
    start_seconds: number;
    end_seconds: number;
  };
  audioBlob?: Blob | null;
}

export interface CaptureDraft {
  context: PageCaptureContext;
  commentary: string;
  captureKind: "text" | "video";
  range?: {
    start_seconds: number;
    end_seconds: number;
  };
  saved_at: string;
}

export interface PublishAnnotationResult {
  annotation: AnnotationResource;
}

export interface ExtensionUser {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
}

export interface AuthState {
  token: string | null;
  user: ExtensionUser | null;
}

function normalizeApiBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function floorNonNegative(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

export async function readApiBase(): Promise<string> {
  if (!globalThis.chrome?.storage?.local) return DEFAULT_API_BASE;
  const result = await chrome.storage.local.get(API_BASE_STORAGE_KEY);
  const stored = typeof result[API_BASE_STORAGE_KEY] === "string" ? result[API_BASE_STORAGE_KEY] : "";
  return stored ? normalizeApiBase(stored) : DEFAULT_API_BASE;
}

export async function saveApiBase(value: string): Promise<string> {
  const normalized = normalizeApiBase(value);
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({
      [API_BASE_STORAGE_KEY]: normalized || DEFAULT_API_BASE
    });
  }
  return normalized || DEFAULT_API_BASE;
}

export async function readAuthState(): Promise<AuthState> {
  if (!globalThis.chrome?.storage?.local) return { token: null, user: null };
  const result = await chrome.storage.local.get([AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY]);
  return {
    token: typeof result[AUTH_TOKEN_STORAGE_KEY] === "string" ? result[AUTH_TOKEN_STORAGE_KEY] : null,
    user: (result[AUTH_USER_STORAGE_KEY] as ExtensionUser | undefined) ?? null
  };
}

export async function clearAuthState(): Promise<void> {
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.remove([AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY]);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { token } = await readAuthState();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function refreshAuthState(): Promise<AuthState> {
  const apiBase = await readApiBase();
  const current = await readAuthState();
  if (!current.token) return current;

  const response = await fetch(`${apiBase}/api/me`, {
    headers: {
      Authorization: `Bearer ${current.token}`
    }
  });
  if (!response.ok) {
    await clearAuthState();
    return { token: null, user: null };
  }

  const payload = (await response.json()) as { user?: ExtensionUser };
  const next = {
    token: current.token,
    user: payload.user ?? current.user
  };
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({
      [AUTH_USER_STORAGE_KEY]: next.user
    });
  }
  return next;
}

export async function connectAuth(provider: "google" | "x" = "google"): Promise<AuthState> {
  const apiBase = await readApiBase();
  const returnTo = typeof globalThis.chrome?.runtime?.getURL === "function"
    ? chrome.runtime.getURL("sidepanel.html?auth=1")
    : globalThis.location.href;
  const search = new URLSearchParams({ return_to: returnTo });
  const start = await fetch(`${apiBase}/api/auth/${provider}/start?${search.toString()}`, {
    credentials: "include"
  });
  if (!start.ok) throw new Error("auth_start_failed");
  const startPayload = (await start.json()) as { authorization_url?: string };
  if (!startPayload.authorization_url) throw new Error("auth_start_failed");

  if (typeof globalThis.chrome?.identity?.launchWebAuthFlow === "function") {
    await chrome.identity.launchWebAuthFlow({
      url: startPayload.authorization_url,
      interactive: true
    });
  } else {
    globalThis.open(startPayload.authorization_url, "_blank", "noopener,noreferrer");
  }

  const tokenResponse = await fetch(`${apiBase}/api/auth/extension-token`, {
    method: "POST",
    credentials: "include"
  });
  if (!tokenResponse.ok) throw new Error("extension_token_failed");
  const tokenPayload = (await tokenResponse.json()) as { token?: string };
  if (!tokenPayload.token) throw new Error("extension_token_failed");

  const meResponse = await fetch(`${apiBase}/api/me`, {
    headers: {
      Authorization: `Bearer ${tokenPayload.token}`
    }
  });
  if (!meResponse.ok) throw new Error("auth_profile_failed");
  const mePayload = (await meResponse.json()) as { user?: ExtensionUser };
  const next = {
    token: tokenPayload.token,
    user: mePayload.user ?? null
  };
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({
      [AUTH_TOKEN_STORAGE_KEY]: next.token,
      [AUTH_USER_STORAGE_KEY]: next.user
    });
  }
  return next;
}

export async function readActiveTabContext(): Promise<PageCaptureContext | null> {
  if (!globalThis.chrome?.tabs?.query) return null;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return null;

  try {
    return await chrome.tabs.sendMessage(tab.id, { type: "ANNOTATED_READ_CONTEXT" });
  } catch {
    return {
      source_url: tab.url,
      title: tab.title
    };
  }
}

export async function readPendingCapture(): Promise<PageCaptureContext | null> {
  if (!globalThis.chrome?.storage?.local) return null;
  const result = await chrome.storage.local.get(PENDING_CAPTURE_STORAGE_KEY);
  const pending = (result[PENDING_CAPTURE_STORAGE_KEY] as PageCaptureContext | undefined) ?? null;
  if (pending && chrome.storage.local.remove) {
    await chrome.storage.local.remove(PENDING_CAPTURE_STORAGE_KEY);
  }
  return pending;
}

export async function readCaptureDraft(): Promise<CaptureDraft | null> {
  if (!globalThis.chrome?.storage?.local) return null;
  const result = await chrome.storage.local.get(CAPTURE_DRAFT_STORAGE_KEY);
  return (result[CAPTURE_DRAFT_STORAGE_KEY] as CaptureDraft | undefined) ?? null;
}

export async function saveCaptureDraft(draft: Omit<CaptureDraft, "saved_at">): Promise<CaptureDraft> {
  const savedDraft = {
    ...draft,
    commentary: draft.commentary.trim(),
    context: {
      ...draft.context,
      selection_text: draft.context.selection_text?.trim()
    },
    saved_at: new Date().toISOString()
  };
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({
      [CAPTURE_DRAFT_STORAGE_KEY]: savedDraft
    });
  }
  return savedDraft;
}

async function uploadAudioCommentary(audioBlob: Blob): Promise<string> {
  const apiBase = await readApiBase();
  const response = await fetch(`${apiBase}/api/uploads/audio-commentary`, {
    method: "POST",
    headers: {
      "Content-Type": audioBlob.type || "audio/webm",
      ...(await authHeaders())
    },
    body: audioBlob
  });
  if (!response.ok) throw new Error("audio upload failed");
  const payload = (await response.json()) as { upload: { asset_id?: string; id: string } };
  return payload.upload.asset_id ?? payload.upload.id;
}

export async function publishAnnotation(options: PublishOptions): Promise<PublishAnnotationResult> {
  const { context, commentary, captureKind, range, audioBlob } = options;
  const apiBase = await readApiBase();
  const sourceUrl = context.source_url ?? "https://www.youtube.com/watch?v=annotated-demo&t=263s";
  const source = SourceRefSchema.parse({
    source_url: sourceUrl,
    source_domain: toSourceDomain(sourceUrl),
    title: context.title || "Untitled source"
  });
  const currentTime = floorNonNegative(context.media?.current_time, 263);
  const startSeconds = floorNonNegative(range?.start_seconds, currentTime);
  const endSeconds = floorNonNegative(range?.end_seconds, currentTime + 47);
  const durationSeconds = endSeconds - startSeconds;
  if (captureKind === "video" && durationSeconds <= 0) {
    throw new Error("invalid_range");
  }
  if (captureKind === "video" && durationSeconds > 90) {
    throw new Error("range_too_long");
  }
  const audioAssetId = audioBlob ? await uploadAudioCommentary(audioBlob) : null;
  const payload = AnnotationCreateSchema.parse({
    clip:
      captureKind === "text"
        ? {
            kind: "text",
            source,
            text: {
              quote: context.selection_text?.trim() || "Selected source text for annotation."
            }
          }
        : {
            kind: context.media?.kind === "audio" ? "audio" : "video",
            source,
            media: {
              start_seconds: startSeconds,
              end_seconds: endSeconds,
              duration_seconds: durationSeconds
            }
          },
    commentary: audioAssetId
      ? {
          kind: "audio",
          text: commentary || undefined,
          audio_asset_id: audioAssetId
        }
      : {
          kind: "text",
          text: commentary || "Captured from the Annotated Canvas side panel."
        },
    visibility: "public",
    client_context: {
      surface: "extension",
      capture_method: captureKind === "text" ? "selection" : "media-timecode"
    }
  });

  const response = await fetch(`${apiBase}/api/annotations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `extension-${Date.now()}`,
      ...(await authHeaders())
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("publish failed");
  const responsePayload = (await response.json()) as { annotation?: unknown };
  return {
    annotation: AnnotationResourceSchema.parse(responsePayload.annotation)
  };
}
