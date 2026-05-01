import { describe, expect, it } from "vitest";
import {
  AnnotationCreateSchema,
  ClaimCreateSchema,
  ClipRefSchema,
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

  it("rejects p95 third-party clips without source attribution", () => {
    const result = ClipRefSchema.safeParse({
      kind: "text",
      text: { quote: "No source should fail." }
    });

    expect(result.success).toBe(false);
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
});
