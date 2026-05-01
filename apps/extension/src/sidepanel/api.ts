import { AnnotationCreateSchema, SourceRefSchema, toSourceDomain } from "@annotated/contracts";

const API_BASE = "http://localhost:8787";

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
  const result = await chrome.storage.local.get("pendingCapture");
  return (result.pendingCapture as PageCaptureContext | undefined) ?? null;
}

async function uploadAudioCommentary(audioBlob: Blob): Promise<string> {
  const response = await fetch(`${API_BASE}/api/uploads/audio-commentary`, {
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
  const audioAssetId = audioBlob ? await uploadAudioCommentary(audioBlob) : null;
  const payload = AnnotationCreateSchema.parse({
    clip:
      captureKind === "text"
        ? {
            kind: "text",
            source,
            text: {
              quote: context.selection_text || "Selected source text for annotation."
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

  const response = await fetch(`${API_BASE}/api/annotations`, {
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
