import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtures, type AnnotationResource } from "@annotated/contracts";
import {
  PRODUCTION_API_BASE,
  clearAuthState,
  connectAuth,
  publishAnnotation,
  readApiBase,
  readAuthState,
  readCaptureDraft,
  readPendingCapture,
  refreshAuthState,
  saveApiBase,
  saveCaptureDraft
} from "./api";

function annotationResponse(id: string): Response {
  const annotation: AnnotationResource = {
    ...fixtures.annotations[0],
    id,
    permalink_url: `https://annotated.example/a/${id}`
  };
  return new Response(JSON.stringify({ annotation }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}

function stubChromeStorage(initialValues: Record<string, unknown> = {}) {
  const storage = new Map<string, unknown>(Object.entries(initialValues));
  const readKey = (key: string) => ({ [key]: storage.get(key) });
  const readKeys = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, storage.get(key)]));
  vi.stubGlobal("chrome", {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://extension-id/${path}`)
    },
    identity: {
      launchWebAuthFlow: vi.fn(async () => "chrome-extension://extension-id/sidepanel.html?auth=1")
    },
    storage: {
      local: {
        get: vi.fn(async (key: string | string[]) => (Array.isArray(key) ? readKeys(key) : readKey(key))),
        set: vi.fn(async (value: Record<string, unknown>) => {
          Object.entries(value).forEach(([key, nextValue]) => storage.set(key, nextValue));
        }),
        remove: vi.fn(async (key: string | string[]) => {
          const keys = Array.isArray(key) ? key : [key];
          keys.forEach((item) => storage.delete(item));
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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(annotationResponse("ann_test"));

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

  it("returns the published annotation id and permalink for browser smoke evidence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(annotationResponse("ann_smoke"));

    await expect(
      publishAnnotation({
        context: {
          source_url: "https://example.com/video",
          title: "Example video",
          media: { current_time: 12, kind: "video" }
        },
        commentary: "Expose the publish result for smoke proof.",
        captureKind: "video",
        range: {
          start_seconds: 12,
          end_seconds: 70
        }
      })
    ).resolves.toMatchObject({
      annotation: {
        id: "ann_smoke",
        permalink_url: "https://annotated.example/a/ann_smoke"
      }
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

  it("rejects reversed p95 media ranges before fetch instead of mutating the entered end time", async () => {
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
          start_seconds: 70,
          end_seconds: 12
        }
      })
    ).rejects.toThrow("invalid_range");

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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(annotationResponse("ann_text"));

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
      .mockResolvedValueOnce(annotationResponse("ann_audio"));

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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(annotationResponse("ann_test"));

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

  it("sends the extension bearer token when publishing as a connected account", async () => {
    stubChromeStorage({
      authToken: "ext_connected"
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(annotationResponse("ann_auth"));

    await publishAnnotation({
      context: {
        source_url: "https://example.com/article",
        title: "Example article",
        selection_text: "Selected text"
      },
      commentary: "Authenticated extension publish.",
      captureKind: "text"
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toMatchObject({
      Authorization: "Bearer ext_connected"
    });
  });

  it("connects through Chrome identity, stores the handoff token, and refreshes the profile", async () => {
    const storage = stubChromeStorage();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authorization_url: "https://accounts.google.com/o/oauth2/v2/auth" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "ext_token", token_type: "Bearer" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: "usr_oauth", handle: "mira", display_name: "Mira OAuth" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: "usr_oauth", handle: "mira", display_name: "Mira OAuth" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    await expect(connectAuth("google")).resolves.toMatchObject({
      token: "ext_token",
      user: {
        handle: "mira"
      }
    });
    expect(storage.get("authToken")).toBe("ext_token");
    expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive: true
      })
    );

    await expect(refreshAuthState()).resolves.toMatchObject({
      token: "ext_token",
      user: {
        handle: "mira"
      }
    });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      headers: {
        Authorization: "Bearer ext_token"
      }
    });
  });

  it("clears the stored extension token when profile refresh fails", async () => {
    const storage = stubChromeStorage({
      authToken: "ext_expired",
      authUser: { id: "usr_oauth", handle: "mira", display_name: "Mira OAuth" }
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("expired", { status: 401 }));

    await expect(refreshAuthState()).resolves.toEqual({
      token: null,
      user: null
    });
    expect(storage.has("authToken")).toBe(false);
    expect(storage.has("authUser")).toBe(false);

    await clearAuthState();
    await expect(readAuthState()).resolves.toEqual({
      token: null,
      user: null
    });
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
