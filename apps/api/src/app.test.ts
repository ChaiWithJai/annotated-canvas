// @vitest-environment node
import { fixtures } from "@annotated/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import { InMemoryRepository } from "./repository";
import { RecordingJobQueue } from "./queue";
import type { Env } from "./types";

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

describe("API router regression coverage", () => {
  let repository: InMemoryRepository;
  let jobs: RecordingJobQueue;

  beforeEach(() => {
    repository = new InMemoryRepository();
    jobs = new RecordingJobQueue();
  });

  it("serves p50 health and feed routes", async () => {
    const health = await handleRequest(request("/api/health"), env, { repository, jobs });
    const feed = await handleRequest(request("/api/feed"), env, { repository, jobs });

    expect(health.status).toBe(200);
    expect((await body(feed)).items).toHaveLength(3);
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
