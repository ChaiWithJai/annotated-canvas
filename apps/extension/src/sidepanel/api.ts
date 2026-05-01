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

export async function publishAnnotation(context: PageCaptureContext, commentary: string, captureKind: "text" | "video") {
  const sourceUrl = context.source_url ?? "https://www.youtube.com/watch?v=annotated-demo&t=263s";
  const source = SourceRefSchema.parse({
    source_url: sourceUrl,
    source_domain: toSourceDomain(sourceUrl),
    title: context.title || "Untitled source"
  });
  const currentTime = Math.max(0, Math.floor(context.media?.current_time ?? 263));
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
              start_seconds: currentTime,
              end_seconds: currentTime + 47,
              duration_seconds: 47
            }
          },
    commentary: {
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
