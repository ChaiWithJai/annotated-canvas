import { fixtures, type AnnotationCreate, type AnnotationResource, type ClaimCreate, type ClaimResource } from "@annotated/contracts";
import type { Repository } from "./types";

function now(): string {
  return new Date().toISOString();
}

function cloneAnnotation(annotation: AnnotationResource): AnnotationResource {
  return structuredClone(annotation);
}

export class InMemoryRepository implements Repository {
  private annotations = new Map<string, AnnotationResource>();
  private claims = new Map<string, ClaimResource>();
  private idempotency = new Map<string, string>();

  constructor(seed: AnnotationResource[] = fixtures.annotations) {
    for (const annotation of seed) {
      this.annotations.set(annotation.id, cloneAnnotation(annotation));
    }
  }

  async listFeed(): Promise<AnnotationResource[]> {
    return Array.from(this.annotations.values())
      .filter((annotation) => annotation.visibility === "public")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(cloneAnnotation);
  }

  async findAnnotation(id: string): Promise<AnnotationResource | null> {
    const annotation = this.annotations.get(id);
    return annotation ? cloneAnnotation(annotation) : null;
  }

  async publishAnnotation(input: AnnotationCreate, idempotencyKey: string): Promise<AnnotationResource> {
    const existingId = this.idempotency.get(`publish:${idempotencyKey}`);
    if (existingId) {
      const existing = await this.findAnnotation(existingId);
      if (existing) return existing;
    }

    const id = `ann_${crypto.randomUUID()}`;
    const timestamp = now();
    const annotation: AnnotationResource = {
      id,
      author_id: fixtures.currentUser.id,
      author: fixtures.currentUser,
      clip: input.clip,
      commentary: input.commentary,
      visibility: input.visibility,
      created_at: timestamp,
      updated_at: timestamp,
      permalink_url: `https://annotated.example/a/${id}`,
      engagement: {
        likes: 0,
        reposts: 0,
        discussions: 0,
        viewer_has_liked: false
      }
    };

    this.annotations.set(id, annotation);
    this.idempotency.set(`publish:${idempotencyKey}`, id);
    return cloneAnnotation(annotation);
  }

  async createClaim(input: ClaimCreate, idempotencyKey = crypto.randomUUID()): Promise<ClaimResource> {
    const existingId = this.idempotency.get(`claim:${idempotencyKey}`);
    if (existingId) {
      const existing = this.claims.get(existingId);
      if (existing) return structuredClone(existing);
    }

    const claim: ClaimResource = {
      id: `claim_${crypto.randomUUID()}`,
      annotation_id: input.annotation_id,
      status: "open",
      created_at: now()
    };

    this.claims.set(claim.id, claim);
    this.idempotency.set(`claim:${idempotencyKey}`, claim.id);
    return structuredClone(claim);
  }

  async recordEngagement(annotationId: string, type: "like" | "repost" | "discuss", idempotencyKey: string): Promise<AnnotationResource> {
    const existingId = this.idempotency.get(`engagement:${idempotencyKey}`);
    const annotation = this.annotations.get(existingId ?? annotationId);
    if (!annotation) {
      throw new Error("annotation_not_found");
    }

    if (!existingId) {
      if (type === "like") annotation.engagement.likes += 1;
      if (type === "repost") annotation.engagement.reposts += 1;
      if (type === "discuss") annotation.engagement.discussions += 1;
      this.idempotency.set(`engagement:${idempotencyKey}`, annotationId);
    }

    return cloneAnnotation(annotation);
  }
}
