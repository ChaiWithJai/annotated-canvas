import { AnnotationCreateSchema, SourceRefSchema, toSourceDomain } from "@annotated/contracts";

export const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
export const PRODUCTION_API_BASE = "https://annotated-canvas-api.jaybhagat841.workers.dev";
const API_BASE_STORAGE_KEY = "apiBaseUrl";
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

function normalizeApiBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
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
      "Content-Type": audioBlob.type || "audio/webm"
    },
    body: audioBlob
  });
  if (!response.ok) throw new Error("audio upload failed");
  const payload = (await response.json()) as { upload: { asset_id?: string; id: string } };
  return payload.upload.asset_id ?? payload.upload.id;
}

export async function publishAnnotation(options: PublishOptions) {
  const { context, commentary, captureKind, range, audioBlob } = options;
  const apiBase = await readApiBase();
  const sourceUrl = context.source_url ?? "https://www.youtube.com/watch?v=annotated-demo&t=263s";
  const source = SourceRefSchema.parse({
    source_url: sourceUrl,
    source_domain: toSourceDomain(sourceUrl),
    title: context.title || "Untitled source"
  });
  const currentTime = Math.max(0, Math.floor(context.media?.current_time ?? 263));
  const startSeconds = Math.max(0, Math.floor(range?.start_seconds ?? currentTime));
  const endSeconds = Math.max(startSeconds + 1, Math.floor(range?.end_seconds ?? currentTime + 47));
  const durationSeconds = endSeconds - startSeconds;
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
      "Idempotency-Key": `extension-${Date.now()}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("publish failed");
  return response.json();
}
