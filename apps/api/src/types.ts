import type {
  AnnotationCreate,
  AnnotationResource,
  ClaimCreate,
  ClaimResource,
  UserResource
} from "@annotated/contracts";

export interface QueueJob {
  job_id: string;
  type: "feed_fanout" | "claim_notice" | "metadata_refresh";
  annotation_id?: string;
  claim_id?: string;
  created_at: string;
}

export interface Env {
  APP_ORIGIN?: string;
  SERVICE_MODE?: string;
  AUTH_MODE?: "demo" | "oauth";
  GOOGLE_CLIENT_ID?: string;
  X_CLIENT_ID?: string;
  DB?: D1Database;
  SESSION_KV?: KVNamespace;
  MEDIA_BUCKET?: R2Bucket;
  JOBS?: Queue<QueueJob>;
  ENGAGEMENT_COUNTERS?: DurableObjectNamespace;
}

export interface Repository {
  listFeed(): Promise<AnnotationResource[]>;
  findAnnotation(id: string): Promise<AnnotationResource | null>;
  findUserByHandle(handle: string): Promise<UserResource | null>;
  listUserAnnotations(handle: string): Promise<AnnotationResource[]>;
  publishAnnotation(input: AnnotationCreate, idempotencyKey: string): Promise<AnnotationResource>;
  createClaim(input: ClaimCreate, idempotencyKey?: string): Promise<ClaimResource>;
  recordEngagement(annotationId: string, type: "like" | "repost" | "discuss", idempotencyKey: string): Promise<AnnotationResource>;
  setFollow(targetUserId: string, following: boolean): Promise<UserResource>;
}

export interface JobQueue {
  send(job: QueueJob): Promise<void>;
}
