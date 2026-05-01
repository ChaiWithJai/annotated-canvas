import type { AnnotationCreate, AnnotationResource, ClaimCreate, ClaimResource } from "@annotated/contracts";

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
  DB?: D1Database;
  SESSION_KV?: KVNamespace;
  MEDIA_BUCKET?: R2Bucket;
  JOBS?: Queue<QueueJob>;
  ENGAGEMENT_COUNTERS?: DurableObjectNamespace;
}

export interface Repository {
  listFeed(): Promise<AnnotationResource[]>;
  findAnnotation(id: string): Promise<AnnotationResource | null>;
  publishAnnotation(input: AnnotationCreate, idempotencyKey: string): Promise<AnnotationResource>;
  createClaim(input: ClaimCreate, idempotencyKey?: string): Promise<ClaimResource>;
  recordEngagement(annotationId: string, type: "like" | "repost" | "discuss", idempotencyKey: string): Promise<AnnotationResource>;
}

export interface JobQueue {
  send(job: QueueJob): Promise<void>;
}
