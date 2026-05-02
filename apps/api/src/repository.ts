import {
  fixtures,
  toSourceDomain,
  type AnnotationCreate,
  type AnnotationResource,
  type ClaimCreate,
  type ClaimEventCreate,
  type ClaimEventResource,
  type ClaimResource,
  type ClipRef,
  type CommentCreate,
  type CommentResource,
  type SourceRef,
  type UserResource
} from "@annotated/contracts";
import type { Repository } from "./types";

const DEFAULT_APP_ORIGIN = "https://annotated.example";

function now(): string {
  return new Date().toISOString();
}

export function normalizeAppOrigin(appOrigin = DEFAULT_APP_ORIGIN): string {
  try {
    return new URL(appOrigin).origin;
  } catch {
    return DEFAULT_APP_ORIGIN;
  }
}

function permalinkUrl(appOrigin: string, annotationId: string): string {
  return `${appOrigin}/a/${annotationId}`;
}

function cloneAnnotation(annotation: AnnotationResource): AnnotationResource {
  return structuredClone(annotation);
}

function authorOrCurrentUser(author?: AnnotationResource["author"]): AnnotationResource["author"] {
  return author ?? fixtures.currentUser;
}

export class InMemoryRepository implements Repository {
  private readonly appOrigin: string;
  private annotations = new Map<string, AnnotationResource>();
  private claims = new Map<string, ClaimResource>();
  private claimEvents = new Map<string, ClaimEventResource>();
  private comments = new Map<string, CommentResource>();
  private idempotency = new Map<string, string>();
  private followedUserIds = new Set<string>(["usr_ren", "usr_ika"]);

  constructor(seed: AnnotationResource[] = fixtures.annotations, appOrigin = DEFAULT_APP_ORIGIN) {
    this.appOrigin = normalizeAppOrigin(appOrigin);
    for (const annotation of seed) {
      this.annotations.set(annotation.id, cloneAnnotation(annotation));
    }
    for (const comment of fixtures.comments) {
      this.comments.set(comment.id, structuredClone(comment));
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

  async findUserByHandle(handle: string): Promise<UserResource | null> {
    const annotations = Array.from(this.annotations.values());
    const author = annotations.map((item) => item.author).find((user) => user.handle === handle);
    if (!author && handle !== fixtures.currentUser.handle) return null;

    const user = author ?? fixtures.currentUser;
    const followers = user.id === fixtures.currentUser.id ? 128 : user.id === "usr_ren" ? 67 : 54;
    return {
      ...user,
      viewer_is_following: this.followedUserIds.has(user.id),
      stats: {
        followers,
        following: user.id === fixtures.currentUser.id ? this.followedUserIds.size : 12,
        annotations: annotations.filter((item) => item.author.id === user.id).length
      }
    };
  }

  async listUserAnnotations(handle: string): Promise<AnnotationResource[]> {
    return Array.from(this.annotations.values())
      .filter((annotation) => annotation.author.handle === handle && annotation.visibility === "public")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(cloneAnnotation);
  }

  async publishAnnotation(
    input: AnnotationCreate,
    idempotencyKey: string,
    author?: AnnotationResource["author"]
  ): Promise<AnnotationResource> {
    const existingId = this.idempotency.get(`publish:${idempotencyKey}`);
    if (existingId) {
      const existing = await this.findAnnotation(existingId);
      if (existing) return existing;
    }

    const resolvedAuthor = authorOrCurrentUser(author);
    const id = `ann_${crypto.randomUUID()}`;
    const timestamp = now();
    const annotation: AnnotationResource = {
      id,
      author_id: resolvedAuthor.id,
      author: resolvedAuthor,
      clip: input.clip,
      commentary: input.commentary,
      visibility: input.visibility,
      created_at: timestamp,
      updated_at: timestamp,
      permalink_url: permalinkUrl(this.appOrigin, id),
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

  async findClaim(id: string): Promise<ClaimResource | null> {
    const claim = this.claims.get(id);
    return claim ? structuredClone(claim) : null;
  }

  async listClaimEvents(claimId: string): Promise<ClaimEventResource[]> {
    return Array.from(this.claimEvents.values())
      .filter((event) => event.claim_id === claimId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((event) => structuredClone(event));
  }

  async createClaimEvent(claimId: string, input: ClaimEventCreate): Promise<ClaimEventResource> {
    const claim = this.claims.get(claimId);
    if (!claim) throw new Error("claim_not_found");

    if (input.status) {
      claim.status = input.status;
    }

    const event: ClaimEventResource = {
      id: `cle_${crypto.randomUUID()}`,
      claim_id: claimId,
      actor_id: fixtures.currentUser.id,
      event_type: input.event_type,
      body: input.body,
      status: input.status,
      created_at: now()
    };
    this.claimEvents.set(event.id, event);
    return structuredClone(event);
  }

  async listComments(annotationId: string): Promise<CommentResource[]> {
    return Array.from(this.comments.values())
      .filter((comment) => comment.annotation_id === annotationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((comment) => structuredClone(comment));
  }

  async createComment(annotationId: string, input: CommentCreate, idempotencyKey: string): Promise<CommentResource> {
    const existingId = this.idempotency.get(`comment:${idempotencyKey}`);
    if (existingId) {
      const existing = this.comments.get(existingId);
      if (existing) return structuredClone(existing);
    }

    const annotation = this.annotations.get(annotationId);
    if (!annotation || annotation.visibility === "deleted") {
      throw new Error("annotation_not_found");
    }

    const comment: CommentResource = {
      id: `cmt_${crypto.randomUUID()}`,
      annotation_id: annotationId,
      author_id: fixtures.currentUser.id,
      author: fixtures.currentUser,
      body: input.body,
      created_at: now()
    };
    this.comments.set(comment.id, comment);
    this.idempotency.set(`comment:${idempotencyKey}`, comment.id);
    annotation.engagement.discussions += 1;
    return structuredClone(comment);
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

  async setFollow(targetUserId: string, following: boolean): Promise<UserResource> {
    const user = Array.from(this.annotations.values())
      .map((annotation) => annotation.author)
      .find((author) => author.id === targetUserId);
    if (!user) throw new Error("user_not_found");

    if (following) this.followedUserIds.add(targetUserId);
    else this.followedUserIds.delete(targetUserId);

    const profile = await this.findUserByHandle(user.handle);
    if (!profile) throw new Error("user_not_found");
    return profile;
  }
}

type D1Row = {
  annotation_id: string;
  author_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  clip_id: string;
  kind: ClipRef["kind"];
  quote: string | null;
  selector: string | null;
  start_seconds: number | null;
  end_seconds: number | null;
  duration_seconds: number | null;
  upload_asset_id: string | null;
  upload_r2_key: string | null;
  upload_stream_uid: string | null;
  owned_by_author: number;
  source_url: string | null;
  source_domain: string | null;
  title: string | null;
  favicon_url: string | null;
  author_name: string | null;
  published_at: string | null;
  commentary_kind: "text" | "audio";
  commentary_text: string | null;
  audio_asset_id: string | null;
  visibility: "public" | "unlisted" | "deleted";
  created_at: string;
  updated_at: string;
  likes: number;
  reposts: number;
  discussions: number;
  viewer_has_liked: number;
};

type UserRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  followers: number;
  following: number;
  annotations: number;
  viewer_is_following: number;
};

type CommentRow = {
  comment_id: string;
  annotation_id: string;
  author_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  body: string;
  created_at: string;
};

type ClaimEventRow = {
  id: string;
  claim_id: string;
  actor_id: string | null;
  event_type: ClaimEventResource["event_type"];
  body: string;
  status: ClaimEventResource["status"] | null;
  created_at: string;
};

function sourceFromRow(row: D1Row): SourceRef {
  if (!row.source_url || !row.source_domain || !row.title) {
    throw new Error("source_missing");
  }

  return {
    source_url: row.source_url,
    source_domain: row.source_domain,
    title: row.title,
    favicon_url: row.favicon_url ?? undefined,
    author_name: row.author_name ?? undefined,
    published_at: row.published_at ?? undefined
  };
}

function clipFromRow(row: D1Row): ClipRef {
  if (row.kind === "text") {
    return {
      kind: "text",
      source: sourceFromRow(row),
      text: {
        quote: row.quote ?? "",
        selector: row.selector ?? undefined
      }
    };
  }

  if (row.kind === "video" || row.kind === "audio") {
    return {
      kind: row.kind,
      source: sourceFromRow(row),
      media: {
        start_seconds: row.start_seconds ?? 0,
        end_seconds: row.end_seconds ?? 0,
        duration_seconds: row.duration_seconds ?? 0
      }
    };
  }

  return {
    kind: "upload",
    source: row.source_url ? sourceFromRow(row) : undefined,
    upload: {
      asset_id: row.upload_asset_id ?? row.clip_id,
      r2_key: row.upload_r2_key ?? undefined,
      stream_uid: row.upload_stream_uid ?? undefined,
      owned_by_author: true
    }
  };
}

function annotationFromRow(row: D1Row, appOrigin: string): AnnotationResource {
  return {
    id: row.annotation_id,
    author_id: row.author_id,
    author: {
      id: row.author_id,
      handle: row.handle,
      display_name: row.display_name,
      avatar_url: row.avatar_url ?? undefined,
      bio: row.bio ?? undefined
    },
    clip: clipFromRow(row),
    commentary:
      row.commentary_kind === "audio"
        ? {
            kind: "audio",
            text: row.commentary_text ?? undefined,
            audio_asset_id: row.audio_asset_id ?? ""
          }
        : {
            kind: "text",
            text: row.commentary_text ?? ""
          },
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
    permalink_url: permalinkUrl(appOrigin, row.annotation_id),
    engagement: {
      likes: row.likes,
      reposts: row.reposts,
      discussions: row.discussions,
      viewer_has_liked: Boolean(row.viewer_has_liked)
    }
  };
}

function userFromRow(row: UserRow): UserResource {
  return {
    id: row.id,
    handle: row.handle,
    display_name: row.display_name,
    avatar_url: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    viewer_is_following: Boolean(row.viewer_is_following),
    stats: {
      followers: row.followers,
      following: row.following,
      annotations: row.annotations
    }
  };
}

function commentFromRow(row: CommentRow): CommentResource {
  return {
    id: row.comment_id,
    annotation_id: row.annotation_id,
    author_id: row.author_id,
    author: {
      id: row.author_id,
      handle: row.handle,
      display_name: row.display_name,
      avatar_url: row.avatar_url ?? undefined,
      bio: row.bio ?? undefined
    },
    body: row.body,
    created_at: row.created_at
  };
}

function claimEventFromRow(row: ClaimEventRow): ClaimEventResource {
  return {
    id: row.id,
    claim_id: row.claim_id,
    actor_id: row.actor_id ?? undefined,
    event_type: row.event_type,
    body: row.body,
    status: row.status ?? undefined,
    created_at: row.created_at
  };
}

export class D1Repository implements Repository {
  private readonly viewerId = fixtures.currentUser.id;
  private readonly appOrigin: string;

  constructor(private readonly db: D1Database, appOrigin = DEFAULT_APP_ORIGIN) {
    this.appOrigin = normalizeAppOrigin(appOrigin);
  }

  async listFeed(): Promise<AnnotationResource[]> {
    const result = await this.db
      .prepare(`${annotationSelectSql()} WHERE a.visibility = 'public' GROUP BY a.id ORDER BY a.created_at DESC`)
      .all<D1Row>();
    return result.results.map((row) => annotationFromRow(row, this.appOrigin));
  }

  async findAnnotation(id: string): Promise<AnnotationResource | null> {
    const row = await this.db.prepare(`${annotationSelectSql()} WHERE a.id = ? GROUP BY a.id`).bind(id).first<D1Row>();
    return row ? annotationFromRow(row, this.appOrigin) : null;
  }

  async findUserByHandle(handle: string): Promise<UserResource | null> {
    const row = await this.db
      .prepare(
        `SELECT
          u.id,
          u.handle,
          u.display_name,
          u.avatar_url,
          u.bio,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS followers,
          (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following,
          (SELECT COUNT(*) FROM annotations a WHERE a.author_id = u.id AND a.visibility = 'public') AS annotations,
          EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followed_id = u.id) AS viewer_is_following
        FROM users u
        WHERE u.handle = ?`
      )
      .bind(this.viewerId, handle)
      .first<UserRow>();

    return row ? userFromRow(row) : null;
  }

  async listUserAnnotations(handle: string): Promise<AnnotationResource[]> {
    const result = await this.db
      .prepare(`${annotationSelectSql()} WHERE u.handle = ? AND a.visibility = 'public' GROUP BY a.id ORDER BY a.created_at DESC`)
      .bind(handle)
      .all<D1Row>();
    return result.results.map((row) => annotationFromRow(row, this.appOrigin));
  }

  async publishAnnotation(
    input: AnnotationCreate,
    idempotencyKey: string,
    author?: AnnotationResource["author"]
  ): Promise<AnnotationResource> {
    const existing = await this.db
      .prepare("SELECT resource_id FROM mutation_idempotency_keys WHERE scope = 'publish' AND idempotency_key = ?")
      .bind(idempotencyKey)
      .first<{ resource_id: string }>();
    if (existing) {
      const annotation = await this.findAnnotation(existing.resource_id);
      if (annotation) return annotation;
    }

    const annotationId = `ann_${crypto.randomUUID()}`;
    const clipId = `clip_${crypto.randomUUID()}`;
    const sourceId = `src_${crypto.randomUUID()}`;
    const timestamp = now();
    const source = "source" in input.clip ? input.clip.source : undefined;

    if (source) {
      await this.db
        .prepare(
          `INSERT OR IGNORE INTO sources (id, source_url, source_domain, title, favicon_url, author_name, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          sourceId,
          source.source_url,
          source.source_domain,
          source.title,
          source.favicon_url ?? null,
          source.author_name ?? null,
          source.published_at ?? null
        )
        .run();
    }

    const resolvedSourceId = source
      ? (await this.db.prepare("SELECT id FROM sources WHERE source_url = ?").bind(source.source_url).first<{ id: string }>())?.id
      : null;

    await this.db
      .prepare(
        `INSERT INTO clips (
          id, source_id, kind, quote, selector, start_seconds, end_seconds, duration_seconds,
          upload_asset_id, upload_r2_key, upload_stream_uid, owned_by_author
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        clipId,
        resolvedSourceId,
        input.clip.kind,
        input.clip.kind === "text" ? input.clip.text.quote : null,
        input.clip.kind === "text" ? (input.clip.text.selector ?? null) : null,
        input.clip.kind === "video" || input.clip.kind === "audio" ? input.clip.media.start_seconds : null,
        input.clip.kind === "video" || input.clip.kind === "audio" ? input.clip.media.end_seconds : null,
        input.clip.kind === "video" || input.clip.kind === "audio" ? input.clip.media.duration_seconds : null,
        input.clip.kind === "upload" ? input.clip.upload.asset_id : null,
        input.clip.kind === "upload" ? (input.clip.upload.r2_key ?? null) : null,
        input.clip.kind === "upload" ? (input.clip.upload.stream_uid ?? null) : null,
        input.clip.kind === "upload" ? 1 : 0
      )
      .run();

    await this.db
      .prepare(
        `INSERT INTO annotations (
          id, author_id, clip_id, commentary_kind, commentary_text, audio_asset_id, visibility, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        annotationId,
        author?.id ?? this.viewerId,
        clipId,
        input.commentary.kind,
        input.commentary.kind === "text" ? input.commentary.text : (input.commentary.text ?? null),
        input.commentary.kind === "audio" ? input.commentary.audio_asset_id : null,
        input.visibility,
        timestamp,
        timestamp
      )
      .run();

    await this.db
      .prepare("INSERT INTO mutation_idempotency_keys (scope, idempotency_key, resource_id) VALUES ('publish', ?, ?)")
      .bind(idempotencyKey, annotationId)
      .run();

    const annotation = await this.findAnnotation(annotationId);
    if (!annotation) throw new Error("annotation_write_failed");
    return annotation;
  }

  async createClaim(input: ClaimCreate, idempotencyKey = crypto.randomUUID()): Promise<ClaimResource> {
    const existing = await this.db
      .prepare("SELECT resource_id FROM mutation_idempotency_keys WHERE scope = 'claim' AND idempotency_key = ?")
      .bind(idempotencyKey)
      .first<{ resource_id: string }>();
    if (existing) {
      const claim = await this.db.prepare("SELECT id, annotation_id, status, created_at FROM claims WHERE id = ?").bind(existing.resource_id).first<ClaimResource>();
      if (claim) return claim;
    }

    const id = `claim_${crypto.randomUUID()}`;
    await this.db
      .prepare(
        `INSERT INTO claims (
          id, annotation_id, claimant_name, claimant_email, relationship, reason, requested_action, status, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`
      )
      .bind(
        id,
        input.annotation_id,
        input.claimant_name,
        input.claimant_email,
        input.relationship,
        input.reason,
        input.requested_action,
        idempotencyKey
      )
      .run();
    await this.db
      .prepare("INSERT INTO mutation_idempotency_keys (scope, idempotency_key, resource_id) VALUES ('claim', ?, ?)")
      .bind(idempotencyKey, id)
      .run();

    const claim = await this.db.prepare("SELECT id, annotation_id, status, created_at FROM claims WHERE id = ?").bind(id).first<ClaimResource>();
    if (!claim) throw new Error("claim_write_failed");
    return claim;
  }

  async findClaim(id: string): Promise<ClaimResource | null> {
    return this.db.prepare("SELECT id, annotation_id, status, created_at FROM claims WHERE id = ?").bind(id).first<ClaimResource>();
  }

  async listClaimEvents(claimId: string): Promise<ClaimEventResource[]> {
    const result = await this.db
      .prepare(
        `SELECT id, claim_id, actor_id, event_type, body, status, created_at
         FROM claim_events
         WHERE claim_id = ?
         ORDER BY created_at ASC`
      )
      .bind(claimId)
      .all<ClaimEventRow>();
    return result.results.map(claimEventFromRow);
  }

  async createClaimEvent(claimId: string, input: ClaimEventCreate): Promise<ClaimEventResource> {
    const claim = await this.findClaim(claimId);
    if (!claim) throw new Error("claim_not_found");

    if (input.status) {
      await this.db.prepare("UPDATE claims SET status = ? WHERE id = ?").bind(input.status, claimId).run();
    }

    const id = `cle_${crypto.randomUUID()}`;
    await this.db
      .prepare(
        `INSERT INTO claim_events (id, claim_id, actor_id, event_type, body, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, claimId, this.viewerId, input.event_type, input.body, input.status ?? null)
      .run();

    const row = await this.db
      .prepare("SELECT id, claim_id, actor_id, event_type, body, status, created_at FROM claim_events WHERE id = ?")
      .bind(id)
      .first<ClaimEventRow>();
    if (!row) throw new Error("claim_event_write_failed");
    return claimEventFromRow(row);
  }

  private async findComment(id: string): Promise<CommentResource | null> {
    const row = await this.db
      .prepare(`${commentSelectSql()} WHERE c.id = ?`)
      .bind(id)
      .first<CommentRow>();
    return row ? commentFromRow(row) : null;
  }

  async listComments(annotationId: string): Promise<CommentResource[]> {
    const result = await this.db
      .prepare(`${commentSelectSql()} WHERE c.annotation_id = ? ORDER BY c.created_at ASC`)
      .bind(annotationId)
      .all<CommentRow>();
    return result.results.map(commentFromRow);
  }

  async createComment(annotationId: string, input: CommentCreate, idempotencyKey: string): Promise<CommentResource> {
    const existing = await this.db
      .prepare("SELECT resource_id FROM mutation_idempotency_keys WHERE scope = 'comment' AND idempotency_key = ?")
      .bind(idempotencyKey)
      .first<{ resource_id: string }>();
    if (existing) {
      const comment = await this.findComment(existing.resource_id);
      if (comment) return comment;
    }

    const annotation = await this.findAnnotation(annotationId);
    if (!annotation || annotation.visibility === "deleted") {
      throw new Error("annotation_not_found");
    }

    const id = `cmt_${crypto.randomUUID()}`;
    await this.db
      .prepare("INSERT INTO comments (id, annotation_id, author_id, body) VALUES (?, ?, ?, ?)")
      .bind(id, annotationId, this.viewerId, input.body)
      .run();
    await this.db
      .prepare("INSERT INTO mutation_idempotency_keys (scope, idempotency_key, resource_id) VALUES ('comment', ?, ?)")
      .bind(idempotencyKey, id)
      .run();
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO engagement_events (id, annotation_id, user_id, type, body, idempotency_key)
         VALUES (?, ?, ?, 'discuss', ?, ?)`
      )
      .bind(`eng_${crypto.randomUUID()}`, annotationId, this.viewerId, input.body, `comment:${idempotencyKey}`)
      .run();

    const comment = await this.findComment(id);
    if (!comment) throw new Error("comment_write_failed");
    return comment;
  }

  async recordEngagement(annotationId: string, type: "like" | "repost" | "discuss", idempotencyKey: string): Promise<AnnotationResource> {
    const existing = await this.db
      .prepare("SELECT resource_id FROM mutation_idempotency_keys WHERE scope = 'engagement' AND idempotency_key = ?")
      .bind(idempotencyKey)
      .first<{ resource_id: string }>();
    if (!existing) {
      await this.db
        .prepare(
          `INSERT INTO engagement_events (id, annotation_id, user_id, type, idempotency_key)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(`eng_${crypto.randomUUID()}`, annotationId, this.viewerId, type, idempotencyKey)
        .run();
      await this.db
        .prepare("INSERT INTO mutation_idempotency_keys (scope, idempotency_key, resource_id) VALUES ('engagement', ?, ?)")
        .bind(idempotencyKey, annotationId)
        .run();
    }

    const annotation = await this.findAnnotation(annotationId);
    if (!annotation) throw new Error("annotation_not_found");
    return annotation;
  }

  async setFollow(targetUserId: string, following: boolean): Promise<UserResource> {
    const user = await this.db.prepare("SELECT handle FROM users WHERE id = ?").bind(targetUserId).first<{ handle: string }>();
    if (!user) throw new Error("user_not_found");

    if (following) {
      await this.db
        .prepare("INSERT OR IGNORE INTO follows (follower_id, followed_id) VALUES (?, ?)")
        .bind(this.viewerId, targetUserId)
        .run();
    } else {
      await this.db
        .prepare("DELETE FROM follows WHERE follower_id = ? AND followed_id = ?")
        .bind(this.viewerId, targetUserId)
        .run();
    }

    const profile = await this.findUserByHandle(user.handle);
    if (!profile) throw new Error("user_not_found");
    return profile;
  }
}

function annotationSelectSql(): string {
  return `SELECT
    a.id AS annotation_id,
    a.author_id,
    u.handle,
    u.display_name,
    u.avatar_url,
    u.bio,
    c.id AS clip_id,
    c.kind,
    c.quote,
    c.selector,
    c.start_seconds,
    c.end_seconds,
    c.duration_seconds,
    c.upload_asset_id,
    c.upload_r2_key,
    c.upload_stream_uid,
    c.owned_by_author,
    s.source_url,
    s.source_domain,
    s.title,
    s.favicon_url,
    s.author_name,
    s.published_at,
    a.commentary_kind,
    a.commentary_text,
    a.audio_asset_id,
    a.visibility,
    a.created_at,
    a.updated_at,
    COALESCE(SUM(CASE WHEN e.type = 'like' THEN 1 ELSE 0 END), 0) AS likes,
    COALESCE(SUM(CASE WHEN e.type = 'repost' THEN 1 ELSE 0 END), 0) AS reposts,
    COALESCE(SUM(CASE WHEN e.type = 'discuss' THEN 1 ELSE 0 END), 0) AS discussions,
    COALESCE(MAX(CASE WHEN e.type = 'like' AND e.user_id = 'usr_demo' THEN 1 ELSE 0 END), 0) AS viewer_has_liked
  FROM annotations a
  JOIN users u ON u.id = a.author_id
  JOIN clips c ON c.id = a.clip_id
  LEFT JOIN sources s ON s.id = c.source_id
  LEFT JOIN engagement_events e ON e.annotation_id = a.id
  `;
}

function commentSelectSql(): string {
  return `SELECT
    c.id AS comment_id,
    c.annotation_id,
    c.author_id,
    u.handle,
    u.display_name,
    u.avatar_url,
    u.bio,
    c.body,
    c.created_at
  FROM comments c
  JOIN users u ON u.id = c.author_id`;
}
