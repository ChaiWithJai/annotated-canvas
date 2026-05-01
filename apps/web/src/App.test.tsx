import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("Annotated web shell", () => {
  function requestUrl(input: RequestInfo | URL) {
    return typeof input === "string" ? input : "url" in input ? input.url : input.toString();
  }

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async function defaultFetch(input: RequestInfo | URL) {
    const url = requestUrl(input);

    if (url.includes("/api/me")) {
      return jsonResponse({
        user: null,
        auth: {
          providers: ["x", "google"],
          extension_token_supported: true
        }
      });
    }

    return jsonResponse(
      {
        error: {
          code: "unexpected_test_request",
          message: `Unexpected test request: ${url}`
        }
      },
      404
    );
  }

  beforeEach(() => {
    window.history.pushState(null, "", "/");
    vi.stubGlobal("fetch", vi.fn(defaultFetch));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderAt(pathname: string) {
    window.history.pushState(null, "", pathname);
    return render(<App />);
  }

  it("renders the p50 feed with source attribution visible", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 2, name: "Public feed" })).toBeInTheDocument();
    expect(screen.getAllByText("youtube.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("File a claim")[0]).toBeInTheDocument();
  });

  it("keeps the p95 claim workflow explicit as a notice flow", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(screen.getAllByText("File a claim")[0]);

    expect(screen.getByRole("dialog", { name: "File a claim" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask for a review" })).toBeInTheDocument();
    expect(screen.getByText(/keep the annotation visible/i)).toBeInTheDocument();
  });

  it("renders p95 empty feed and removed permalink states", () => {
    const { unmount } = renderAt("/empty");
    expect(screen.getByText("No annotations yet.")).toBeInTheDocument();
    unmount();

    renderAt("/a/removed");
    expect(screen.getByText(/has been removed by the author/i)).toBeInTheDocument();
    expect(screen.getByText("youtube.com")).toBeInTheDocument();
  });

  it("renders profile follow state changes", async () => {
    const user = userEvent.setup();
    renderAt("/u/mira");

    await user.click(screen.getByRole("button", { name: /follow/i }));

    expect(screen.getByRole("button", { name: /following/i })).toBeInTheDocument();
  });

  it("renders the marketing signup view with feed preview", () => {
    renderAt("/home");

    expect(screen.getByRole("heading", { name: /save the exact moment/i })).toBeInTheDocument();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    expect(screen.getByText("View public feed")).toBeInTheDocument();
    expect(screen.getByText("Extension install guide")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /see the feed, load the extension/i })).toBeInTheDocument();
  });

  it("checks signed-out session state with credentials on load", async () => {
    renderAt("/");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/me"), {
        credentials: "include"
      });
    });
    expect(screen.getByText("Signed out")).toBeInTheDocument();
  });

  it("opens provider choice from header and renders missing-provider errors inline", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.includes("/api/me")) {
        return jsonResponse({ user: null });
      }

      if (url.includes("/api/auth/google/start")) {
        return jsonResponse(
          {
            error: {
              code: "auth_provider_not_configured",
              message: "Google sign-in is not configured."
            }
          },
          503
        );
      }

      return defaultFetch(input);
    });

    renderAt("/");

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("heading", { name: /save the exact moment/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/google/start?"), {
        method: "GET"
      });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/google sign-in is not configured/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/load the unpacked extension/i);
    expect(screen.getByText("Install extension")).toBeInTheDocument();
  });

  it("starts X auth through fetch and follows the returned authorization URL", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    let authorizationUrl = "";

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.includes("/api/me")) {
        return jsonResponse({ user: null });
      }

      if (url.includes("/api/auth/x/start")) {
        return jsonResponse({ authorization_url: authorizationUrl });
      }

      return defaultFetch(input);
    });

    renderAt("/home");
    authorizationUrl = new URL("/oauth/x", window.location.href).toString();

    await user.click(screen.getByRole("button", { name: /sign in with x/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/x/start?"), {
        method: "GET"
      });
      expect(window.location.href).toBe(authorizationUrl);
    });
  });

  it("renders the bounty URL capture composer on the feed", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { name: "Create an annotation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Source URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Your note")).toBeInTheDocument();
  });

  it("renders comments on the permalink page", () => {
    renderAt("/a/ann_video_minimalism");

    expect(screen.getByText("Discussion")).toBeInTheDocument();
    expect(screen.getByText(/source link matters here/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Add a comment")).toBeInTheDocument();
  });
});
