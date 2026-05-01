import {
  AnnotationCreateSchema,
  fixtures,
  toSourceDomain,
  type AnnotationCreate,
  type AnnotationResource,
  type CommentResource,
  type EngagementCreate,
  type UserResource
} from "@annotated/contracts";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");
const shouldFetch = import.meta.env.MODE !== "test";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json() as Promise<T>;
}

export async function loadFeed(): Promise<AnnotationResource[]> {
  if (!shouldFetch) return fixtures.annotations;
  try {
    const payload = await getJson<{ items: AnnotationResource[] }>("/api/feed");
    return payload.items;
  } catch {
    return fixtures.annotations;
  }
}

export async function loadAnnotation(id: string): Promise<AnnotationResource | null> {
  if (!shouldFetch) return fixtures.annotations.find((item) => item.id === id) ?? fixtures.annotations[0];
  try {
    const payload = await getJson<{ annotation: AnnotationResource }>(`/api/annotations/${id}`);
    return payload.annotation;
  } catch {
    return fixtures.annotations.find((item) => item.id === id) ?? null;
  }
}

export async function loadProfile(handle: string): Promise<UserResource> {
  const fallback = {
    ...fixtures.currentUser,
    viewer_is_following: false,
    stats: {
      followers: 128,
      following: 64,
      annotations: fixtures.annotations.filter((item) => item.author.handle === handle).length
    }
  };

  if (!shouldFetch) return fallback;
  try {
    const payload = await getJson<{ user: UserResource }>(`/api/users/${handle}`);
    return payload.user;
  } catch {
    return fallback;
  }
}

export async function loadProfileAnnotations(handle: string): Promise<AnnotationResource[]> {
  if (!shouldFetch) return fixtures.annotations.filter((item) => item.author.handle === handle);
  try {
    const payload = await getJson<{ items: AnnotationResource[] }>(`/api/users/${handle}/annotations`);
    return payload.items;
  } catch {
    return fixtures.annotations.filter((item) => item.author.handle === handle);
  }
}

export async function submitClaim(annotationId: string, reason: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/claims`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `claim-${annotationId}-${Date.now()}`
    },
    body: JSON.stringify({
      annotation_id: annotationId,
      claimant_name: "Demo claimant",
      claimant_email: "claims@example.com",
      relationship: "copyright-owner",
      reason,
      requested_action: "review"
    })
  });
  if (!response.ok) throw new Error("claim submission failed");
  const payload = (await response.json()) as { claim: { id: string } };
  return payload.claim.id;
}

export async function publishWebAnnotation(input: {
  sourceUrl: string;
  title: string;
  mode: "text" | "video";
  quote: string;
  startSeconds: number;
  endSeconds: number;
  commentary: string;
}): Promise<AnnotationResource> {
  const source = {
    source_url: input.sourceUrl,
    source_domain: toSourceDomain(input.sourceUrl),
    title: input.title
  };
  const payload: AnnotationCreate = AnnotationCreateSchema.parse({
    clip:
      input.mode === "text"
        ? {
            kind: "text",
            source,
            text: {
              quote: input.quote
            }
          }
        : {
            kind: "video",
            source,
            media: {
              start_seconds: input.startSeconds,
              end_seconds: input.endSeconds,
              duration_seconds: input.endSeconds - input.startSeconds
            }
          },
    commentary: {
      kind: "text",
      text: input.commentary
    },
    visibility: "public",
    client_context: {
      surface: "web",
      capture_method: input.mode === "text" ? "selection" : "media-timecode"
    }
  });

  const response = await fetch(`${API_BASE}/api/annotations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `web-${Date.now()}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("annotation publish failed");
  const result = (await response.json()) as { annotation: AnnotationResource };
  return result.annotation;
}

export async function sendEngagement(annotationId: string, type: EngagementCreate["type"]): Promise<AnnotationResource> {
  const response = await fetch(`${API_BASE}/api/annotations/${annotationId}/engagement`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `engagement-${annotationId}-${type}-${Date.now()}`
    },
    body: JSON.stringify({ type })
  });
  if (!response.ok) throw new Error("engagement failed");
  const payload = (await response.json()) as { annotation: AnnotationResource };
  return payload.annotation;
}

export async function loadComments(annotationId: string): Promise<CommentResource[]> {
  if (!shouldFetch) return fixtures.comments.filter((comment) => comment.annotation_id === annotationId);
  try {
    const payload = await getJson<{ items: CommentResource[] }>(`/api/annotations/${annotationId}/comments`);
    return payload.items;
  } catch {
    return fixtures.comments.filter((comment) => comment.annotation_id === annotationId);
  }
}

export async function submitComment(annotationId: string, body: string): Promise<CommentResource> {
  const response = await fetch(`${API_BASE}/api/annotations/${annotationId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `comment-${annotationId}-${Date.now()}`
    },
    body: JSON.stringify({ body })
  });
  if (!response.ok) throw new Error("comment submission failed");
  const payload = (await response.json()) as { comment: CommentResource };
  return payload.comment;
}
