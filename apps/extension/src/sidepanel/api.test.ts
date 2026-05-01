import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRODUCTION_API_BASE,
  publishAnnotation,
  readApiBase,
  readCaptureDraft,
  readPendingCapture,
  saveApiBase,
  saveCaptureDraft
} from "./api";

function stubChromeStorage(initialValues: Record<string, unknown> = {}) {
  const storage = new Map<string, unknown>(Object.entries(initialValues));
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage.get(key) })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          Object.entries(value).forEach(([key, nextValue]) => storage.set(key, nextValue));
        }),
        remove: vi.fn(async (key: string) => {
          storage.delete(key);
        })
      }
    }
  });
  return storage;
}

describe("extension publish API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("publishes the exact p50 time range entered in the side panel", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ annotation: { id: "ann_test" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );

    await publishAnnotation({
      context: {
        source_url: "https://example.com/video",
        title: "Example video",
        media: { current_time: 12, kind: "video" }
      },
      commentary: "This clip uses the user-entered range.",
      captureKind: "video",
      range: {
        start_seconds: 12,
        end_seconds: 70
      }
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.clip.media).toEqual({
      start_seconds: 12,
      end_seconds: 70,
      duration_seconds: 58
    });
  });

  it("rejects p95 time ranges above the 90 second bounty cap before fetch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      publishAnnotation({
        context: {
          source_url: "https://example.com/video",
          title: "Example video"
        },
        commentary: "This should not publish.",
        captureKind: "video",
        range: {
          start_seconds: 0,
          end_seconds: 120
        }
      })
    ).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects p95 audio commentary publishes above the 90 second cap before upload or publish fetch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      publishAnnotation({
        context: {
          source_url: "https://example.com/audio",
          title: "Example audio",
          media: { current_time: 0, kind: "audio" }
        },
        commentary: "This audio note should not upload.",
        captureKind: "video",
        range: {
          start_seconds: 0,
          end_seconds: 91
        },
        audioBlob: new Blob(["audio"], { type: "audio/webm" })
      })
    ).rejects.toThrow("range_too_long");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes exact p95 selected text from the context-menu capture path", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ annotation: { id: "ann_text" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );

    await publishAnnotation({
      context: {
        source_url: "https://example.com/article",
        title: "Example article",
        selection_text: "  Exact selected quote for smoke evidence.  "
      },
      commentary: "Selected text smoke note.",
      captureKind: "text"
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.clip).toMatchObject({
      kind: "text",
      text: {
        quote: "Exact selected quote for smoke evidence."
      }
    });
    expect(body.client_context).toMatchObject({
      surface: "extension",
      capture_method: "selection"
    });
  });

  it("uploads recorded audio commentary before publishing an audio annotation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ upload: { id: "upl_test", asset_id: "upl_test" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ annotation: { id: "ann_audio" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        })
      );

    await publishAnnotation({
      context: {
        source_url: "https://example.com/audio",
        title: "Example audio",
        media: { current_time: 4, kind: "audio" }
      },
      commentary: "Recorded commentary note.",
      captureKind: "video",
      range: {
        start_seconds: 4,
        end_seconds: 20
      },
      audioBlob: new Blob(["audio"], { type: "audio/webm" })
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/uploads/audio-commentary");
    const publishRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const body = JSON.parse(String(publishRequest.body));
    expect(body.commentary).toMatchObject({
      kind: "audio",
      audio_asset_id: "upl_test"
    });
  });

  it("uses the stored API base so review builds can target production without source edits", async () => {
    stubChromeStorage();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ annotation: { id: "ann_test" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );

    await saveApiBase(`${PRODUCTION_API_BASE}/`);
    expect(await readApiBase()).toBe(PRODUCTION_API_BASE);

    await publishAnnotation({
      context: {
        source_url: "https://example.com/article",
        title: "Example article",
        selection_text: "Selected text"
      },
      commentary: "Configurable API base test.",
      captureKind: "text"
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `${PRODUCTION_API_BASE}/api/annotations`
    );
  });

  it("clears stale pending selected-text captures after reading them once", async () => {
    const storage = stubChromeStorage({
      pendingCapture: {
        source_url: "https://example.com/article",
        title: "Example article",
        selection_text: "Selected quote"
      }
    });

    await expect(readPendingCapture()).resolves.toMatchObject({
      selection_text: "Selected quote"
    });
    expect(storage.has("pendingCapture")).toBe(false);
  });

  it("persists a local capture draft with trimmed commentary for repeatable smoke runs", async () => {
    stubChromeStorage();

    const draft = await saveCaptureDraft({
      context: {
        source_url: "https://example.com/video",
        title: "Example video"
      },
      commentary: "  Draft commentary for smoke.  ",
      captureKind: "video",
      range: {
        start_seconds: 12,
        end_seconds: 70
      }
    });

    expect(draft).toMatchObject({
      commentary: "Draft commentary for smoke.",
      captureKind: "video",
      range: {
        start_seconds: 12,
        end_seconds: 70
      }
    });
    await expect(readCaptureDraft()).resolves.toMatchObject({
      commentary: "Draft commentary for smoke."
    });
  });
});
