import { afterEach, describe, expect, it, vi } from "vitest";
import { publishAnnotation, readApiBase, saveApiBase } from "./api";

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
    const storage = new Map<string, string>();
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storage.get(key) })),
          set: vi.fn(async (value: Record<string, string>) => {
            Object.entries(value).forEach(([key, nextValue]) => storage.set(key, nextValue));
          })
        }
      }
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ annotation: { id: "ann_test" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );

    await saveApiBase("https://annotated-canvas-api.example.workers.dev/");
    expect(await readApiBase()).toBe("https://annotated-canvas-api.example.workers.dev");

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
      "https://annotated-canvas-api.example.workers.dev/api/annotations"
    );
  });
});
