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

export type AuthProvider = "google" | "x";
export type ViewerSession = {
  user: Pick<UserResource, "id" | "handle" | "display_name" | "avatar_url"> | null;
  auth?: {
    providers?: AuthProvider[];
    extension_token_supported?: boolean;
  };
};

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json() as Promise<T>;
}

async function requestError(response: Response, fallback: string): Promise<ApiRequestError> {
  try {
    const payload = (await response.json()) as ErrorEnvelope;
    return new ApiRequestError(response.status, payload.error?.message ?? fallback, payload.error?.code);
  } catch {
    return new ApiRequestError(response.status, fallback);
  }
}

export async function loadCurrentViewer(): Promise<ViewerSession> {
  const response = await fetch(`${API_BASE}/api/me`, {
    credentials: "include"
  });

  if (response.status === 401 || response.status === 403) return { user: null };
  if (!response.ok) throw await requestError(response, "Could not check sign-in status.");

  const payload = (await response.json()) as ViewerSession;
  return {
    user: payload.user ?? null,
    auth: payload.auth
  };
}

export async function startAuth(provider: AuthProvider, returnTo: string): Promise<string> {
  const search = new URLSearchParams({ return_to: returnTo });
  const response = await fetch(`${API_BASE}/api/auth/${provider}/start?${search.toString()}`, {
    method: "GET"
  });

  if (!response.ok) {
    throw await requestError(response, `Could not start ${provider === "google" ? "Google" : "X"} sign-in.`);
  }

  const payload = (await response.json()) as { authorization_url?: string };
  if (!payload.authorization_url) {
    throw new ApiRequestError(response.status, "Sign-in is not configured for this provider yet.", "auth_not_configured");
  }
  return payload.authorization_url;
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

export async function setFollow(targetUserId: string, following: boolean): Promise<UserResource> {
  if (!shouldFetch) {
    return {
      ...fixtures.currentUser,
      id: targetUserId,
      viewer_is_following: following,
      stats: {
        followers: following ? 129 : 128,
        following: 64,
        annotations: 1
      }
    };
  }

  const response = await fetch(`${API_BASE}/api/follows/${targetUserId}`, {
    method: following ? "PUT" : "DELETE"
  });
  if (!response.ok) throw new Error("follow update failed");
  const payload = (await response.json()) as { user: UserResource };
  return payload.user;
}
