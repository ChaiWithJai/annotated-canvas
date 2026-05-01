import { describe, expect, it } from "vitest";
import {
  AUDIO_COMMENTARY_MAX_BYTES,
  AnnotationCreateSchema,
  AudioCommentaryUploadResponseSchema,
  ClaimCreateSchema,
  ClaimEventCreateSchema,
  ClipRefSchema,
  CommentCreateSchema,
  OwnedVideoUploadIntentResponseSchema,
  fixtures
} from "./index";

describe("contract validation", () => {
  it("accepts p50 text annotation creation", () => {
    const payload = {
      clip: fixtures.annotations[1].clip,
      commentary: { kind: "text", text: "A useful editorial note." },
      visibility: "public",
      client_context: { surface: "web", capture_method: "selection" }
    };

    expect(AnnotationCreateSchema.parse(payload).clip.kind).toBe("text");
  });

  it("accepts p50 media clip references under 90 seconds", () => {
    const result = ClipRefSchema.safeParse(fixtures.annotations[0].clip);

    expect(result.success).toBe(true);
  });

  it("rejects p95 media ranges that exceed bounty duration", () => {
    const result = ClipRefSchema.safeParse({
      kind: "video",
      source: fixtures.sources.youtube,
      media: {
        start_seconds: 5,
        end_seconds: 120,
        duration_seconds: 115
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects p95 third-party media payloads that include upload storage fields", () => {
    const result = ClipRefSchema.safeParse({
      kind: "video",
      source: fixtures.sources.youtube,
      media: {
        start_seconds: 5,
        end_seconds: 60,
        duration_seconds: 55
      },
      upload: {
        asset_id: "upl_third_party_copy",
        stream_uid: "stream_third_party_copy",
        owned_by_author: true
      }
    });

    expect(result.success).toBe(false);
  });

  it("requires creator-owned attestation for upload clip references", () => {
    const result = ClipRefSchema.safeParse({
      kind: "upload",
      upload: {
        asset_id: "upl_owned_video",
        stream_uid: "stream_owned_video",
        owned_by_author: false
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects p95 third-party clips without source attribution", () => {
    const result = ClipRefSchema.safeParse({
      kind: "text",
      text: { quote: "No source should fail." }
    });

    expect(result.success).toBe(false);
  });

  it("accepts p50 audio commentary only when an audio asset id is present", () => {
    const result = AnnotationCreateSchema.safeParse({
      clip: fixtures.annotations[0].clip,
      commentary: {
        kind: "audio",
        text: "Recorded commentary transcript note.",
        audio_asset_id: "upl_audio_commentary"
      },
      visibility: "public",
      client_context: { surface: "extension", capture_method: "media-timecode" }
    });

    expect(result.success).toBe(true);
  });

  it("rejects p95 audio commentary without an audio asset id", () => {
    const result = AnnotationCreateSchema.safeParse({
      clip: fixtures.annotations[0].clip,
      commentary: {
        kind: "audio",
        text: "Missing upload metadata should fail."
      },
      visibility: "public",
      client_context: { surface: "extension", capture_method: "media-timecode" }
    });

    expect(result.success).toBe(false);
  });

  it("documents the current audio upload response as intent or stored, not finalized", () => {
    const result = AudioCommentaryUploadResponseSchema.parse({
      id: "upl_audio",
      asset_id: "upl_audio",
      kind: "audio-commentary",
      storage: "r2",
      r2_key: "audio-commentary/upl_audio.webm",
      max_bytes: AUDIO_COMMENTARY_MAX_BYTES,
      status: "intent-created"
    });

    expect(result.status).toBe("intent-created");
  });

  it("documents owned-video uploads as intent-only until 240p processing exists", () => {
    const result = OwnedVideoUploadIntentResponseSchema.parse({
      id: "upl_video",
      kind: "owned-video",
      storage: "stream",
      status: "intent-created"
    });

    expect(result.status).toBe("intent-created");
  });

  it("keeps claim filing as notice intake with concrete claimant evidence", () => {
    const result = ClaimCreateSchema.safeParse({
      annotation_id: "ann_video_minimalism",
      claimant_name: "Rights Holder",
      claimant_email: "rights@example.com",
      relationship: "copyright-owner",
      reason:
        "I own this source and want the annotation reviewed for attribution and fair-use boundaries.",
      requested_action: "review"
    });

    expect(result.success).toBe(true);
  });

  it("accepts p50 public comments on annotations", () => {
    const result = CommentCreateSchema.safeParse({
      body: "This comment adds a useful source-level discussion note."
    });

    expect(result.success).toBe(true);
  });

  it("rejects p95 empty comments", () => {
    const result = CommentCreateSchema.safeParse({ body: "" });

    expect(result.success).toBe(false);
  });

  it("accepts p50 claim events with optional status transitions", () => {
    const result = ClaimEventCreateSchema.safeParse({
      event_type: "status-change",
      body: "Moderator requested more context from the claimant.",
      status: "needs_info"
    });

    expect(result.success).toBe(true);
  });
});
