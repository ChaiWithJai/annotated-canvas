import { fixtures, type AnnotationResource, type UserResource } from "@annotated/contracts";

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
