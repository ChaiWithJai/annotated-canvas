import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Cloudflare Worker runtime", () => {
  it("serves the public health route inside workerd", async () => {
    const response = await SELF.fetch("https://annotated.test/api/health");
    const payload = await response.json<{ ok: boolean; service: string }>();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.service).toBe("annotated-canvas-api");
  });
});
