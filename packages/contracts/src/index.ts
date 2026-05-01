import { z } from "zod";

export const SourceRefSchema = z.object({
  source_url: z.string().url(),
  source_domain: z.string().min(1),
  title: z.string().min(1),
  favicon_url: z.string().url().optional(),
  author_name: z.string().optional(),
  published_at: z.string().datetime().optional()
});

export const TextClipRefSchema = z.object({
  kind: z.literal("text"),
  source: SourceRefSchema,
  text: z.object({
    quote: z.string().min(1).max(4000),
    selector: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional()
  })
});

const MediaRangeSchema = z
  .object({
    start_seconds: z.number().nonnegative(),
    end_seconds: z.number().positive(),
    duration_seconds: z.number().positive().max(90)
  })
  .superRefine((range, ctx) => {
    if (range.end_seconds <= range.start_seconds) {
      ctx.addIssue({
        code: "custom",
        message: "end_seconds must be greater than start_seconds",
        path: ["end_seconds"]
      });
    }

    const computedDuration = range.end_seconds - range.start_seconds;
    if (Math.abs(computedDuration - range.duration_seconds) > 0.5) {
      ctx.addIssue({
        code: "custom",
        message: "duration_seconds must match end_seconds - start_seconds",
        path: ["duration_seconds"]
      });
    }
  });

export const VideoClipRefSchema = z.object({
  kind: z.literal("video"),
  source: SourceRefSchema,
  media: MediaRangeSchema
});

export const AudioClipRefSchema = z.object({
  kind: z.literal("audio"),
  source: SourceRefSchema,
  media: MediaRangeSchema
});

export const UploadClipRefSchema = z.object({
  kind: z.literal("upload"),
  source: SourceRefSchema.optional(),
  upload: z.object({
    asset_id: z.string().min(1),
    r2_key: z.string().optional(),
    stream_uid: z.string().optional(),
    owned_by_author: z.literal(true)
  })
});

export const ClipRefSchema = z.discriminatedUnion("kind", [
  TextClipRefSchema,
  VideoClipRefSchema,
  AudioClipRefSchema,
  UploadClipRefSchema
]);

export const TextCommentarySchema = z.object({
  kind: z.literal("text"),
  text: z.string().min(1).max(8000)
});

export const AudioCommentarySchema = z.object({
  kind: z.literal("audio"),
  text: z.string().max(8000).optional(),
  audio_asset_id: z.string().min(1)
});

export const CommentarySchema = z.discriminatedUnion("kind", [
  TextCommentarySchema,
  AudioCommentarySchema
]);

export const AnnotationVisibilitySchema = z.enum(["public", "unlisted", "deleted"]);

export const AnnotationCreateSchema = z.object({
  clip: ClipRefSchema,
  commentary: CommentarySchema,
  visibility: z.enum(["public", "unlisted"]).default("public"),
  client_context: z.object({
    surface: z.enum(["extension", "web"]),
    tab_id: z.string().optional(),
    capture_method: z.enum(["selection", "media-timecode", "url-input"])
  })
});

export const AnnotationResourceSchema = z.object({
  id: z.string().min(1),
  author_id: z.string().min(1),
  author: z.object({
    id: z.string().min(1),
    handle: z.string().min(1),
    display_name: z.string().min(1),
    avatar_url: z.string().url().optional(),
    bio: z.string().optional()
  }),
  clip: ClipRefSchema,
  commentary: CommentarySchema,
  visibility: AnnotationVisibilitySchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  permalink_url: z.string().url(),
  engagement: z.object({
    likes: z.number().int().nonnegative(),
    reposts: z.number().int().nonnegative(),
    discussions: z.number().int().nonnegative(),
    viewer_has_liked: z.boolean().default(false)
  })
});

export const FeedResponseSchema = z.object({
  items: z.array(AnnotationResourceSchema),
  next_cursor: z.string().nullable()
});

export const UserResourceSchema = z.object({
  id: z.string().min(1),
  handle: z.string().min(1),
  display_name: z.string().min(1),
  avatar_url: z.string().url().optional(),
  bio: z.string().optional(),
  viewer_is_following: z.boolean().default(false),
  stats: z.object({
    followers: z.number().int().nonnegative(),
    following: z.number().int().nonnegative(),
    annotations: z.number().int().nonnegative()
  })
});

export const ClaimCreateSchema = z.object({
  annotation_id: z.string().min(1),
  claimant_name: z.string().min(1).max(200),
  claimant_email: z.string().email(),
  relationship: z.enum(["copyright-owner", "authorized-agent", "creator", "other"]),
  reason: z.string().min(20).max(5000),
  requested_action: z.enum(["review", "remove", "attribute", "contact-author"])
});

export const ClaimResourceSchema = z.object({
  id: z.string().min(1),
  annotation_id: z.string().min(1),
  status: z.enum(["open", "needs_info", "accepted", "rejected", "withdrawn"]),
  created_at: z.string().datetime()
});

export const ClaimEventCreateSchema = z.object({
  event_type: z.enum(["claimant-note", "moderator-note", "status-change"]),
  body: z.string().min(1).max(5000),
  status: ClaimResourceSchema.shape.status.optional()
});

export const ClaimEventResourceSchema = z.object({
  id: z.string().min(1),
  claim_id: z.string().min(1),
  actor_id: z.string().min(1).optional(),
  event_type: ClaimEventCreateSchema.shape.event_type,
  body: z.string().min(1),
  status: ClaimResourceSchema.shape.status.optional(),
  created_at: z.string().datetime()
});

export const EngagementCreateSchema = z.object({
  type: z.enum(["like", "repost", "discuss"]),
  body: z.string().max(2000).optional()
});

export const CommentCreateSchema = z.object({
  body: z.string().min(1).max(2000)
});

export const CommentResourceSchema = z.object({
  id: z.string().min(1),
  annotation_id: z.string().min(1),
  author_id: z.string().min(1),
  author: z.object({
    id: z.string().min(1),
    handle: z.string().min(1),
    display_name: z.string().min(1),
    avatar_url: z.string().url().optional(),
    bio: z.string().optional()
  }),
  body: z.string().min(1),
  created_at: z.string().datetime()
});

export const AuthProviderSchema = z.enum(["x", "google"]);

export const AuthStartResponseSchema = z.object({
  provider: AuthProviderSchema,
  mode: z.enum(["oauth", "demo"]),
  authorization_url: z.string().url(),
  state: z.string().min(1)
});

export const ExtensionTokenResponseSchema = z.object({
  token: z.string().min(1),
  expires_in: z.number().int().positive(),
  token_type: z.literal("Bearer")
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).default({})
  }),
  request_id: z.string().min(1)
});

export type SourceRef = z.infer<typeof SourceRefSchema>;
export type ClipRef = z.infer<typeof ClipRefSchema>;
export type AnnotationCreate = z.infer<typeof AnnotationCreateSchema>;
export type AnnotationResource = z.infer<typeof AnnotationResourceSchema>;
export type ClaimCreate = z.infer<typeof ClaimCreateSchema>;
export type ClaimEventCreate = z.infer<typeof ClaimEventCreateSchema>;
export type ClaimEventResource = z.infer<typeof ClaimEventResourceSchema>;
export type ClaimResource = z.infer<typeof ClaimResourceSchema>;
export type CommentCreate = z.infer<typeof CommentCreateSchema>;
export type CommentResource = z.infer<typeof CommentResourceSchema>;
export type EngagementCreate = z.infer<typeof EngagementCreateSchema>;
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
export type UserResource = z.infer<typeof UserResourceSchema>;

export const fixtures = {
  currentUser: {
    id: "usr_demo",
    handle: "mira",
    display_name: "Mira Chen",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    bio: "Researcher collecting precise media moments."
  },
  sources: {
    youtube: {
      source_url: "https://www.youtube.com/watch?v=annotated-demo&t=263s",
      source_domain: "youtube.com",
      title: "Minimalist Design Theory: A Comprehensive Guide",
      favicon_url: "https://www.youtube.com/s/desktop/28b0985e/img/favicon_32x32.png",
      author_name: "Design Systems Lab"
    },
    article: {
      source_url: "https://example.com/essays/calm-interface-density",
      source_domain: "example.com",
      title: "Calm Interface Density",
      author_name: "Nadia Park"
    },
    podcast: {
      source_url: "https://example.fm/episodes/edge-computing-for-products",
      source_domain: "example.fm",
      title: "Edge Computing for Product Teams",
      author_name: "Edge Notes"
    }
  },
  comments: [
    {
      id: "cmt_launch_1",
      annotation_id: "ann_video_minimalism",
      author_id: "usr_ren",
      author: {
        id: "usr_ren",
        handle: "ren",
        display_name: "Ren Alvarez",
        avatar_url:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
        bio: "Interface critic and product editor."
      },
      body: "The source link matters here because the clip is only useful with the surrounding argument.",
      created_at: "2026-05-01T00:45:00.000Z"
    }
  ] satisfies CommentResource[],
  annotations: [
    {
      id: "ann_video_minimalism",
      author_id: "usr_demo",
      author: {
        id: "usr_demo",
        handle: "mira",
        display_name: "Mira Chen",
        avatar_url:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
        bio: "Researcher collecting precise media moments."
      },
      clip: {
        kind: "video",
        source: {
          source_url: "https://www.youtube.com/watch?v=annotated-demo&t=263s",
          source_domain: "youtube.com",
          title: "Minimalist Design Theory: A Comprehensive Guide",
          favicon_url: "https://www.youtube.com/s/desktop/28b0985e/img/favicon_32x32.png",
          author_name: "Design Systems Lab"
        },
        media: {
          start_seconds: 263,
          end_seconds: 310,
          duration_seconds: 47
        }
      },
      commentary: {
        kind: "text",
        text: "This is the moment where restraint stops being aesthetic and becomes an operating constraint."
      },
      visibility: "public",
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
      permalink_url: "https://annotated.example/a/ann_video_minimalism",
      engagement: {
        likes: 42,
        reposts: 8,
        discussions: 6,
        viewer_has_liked: false
      }
    },
    {
      id: "ann_text_density",
      author_id: "usr_ren",
      author: {
        id: "usr_ren",
        handle: "ren",
        display_name: "Ren Alvarez",
        avatar_url:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
        bio: "Interface critic and product editor."
      },
      clip: {
        kind: "text",
        source: {
          source_url: "https://example.com/essays/calm-interface-density",
          source_domain: "example.com",
          title: "Calm Interface Density",
          author_name: "Nadia Park"
        },
        text: {
          quote:
            "A quiet interface is not an empty interface. It is an interface where every visible thing has earned its place.",
          prefix: "The editor argues that",
          suffix: "and then moves into operational examples."
        }
      },
      commentary: {
        kind: "text",
        text: "This is the principle the side panel has to preserve: dense enough for repeated work, quiet enough for judgment."
      },
      visibility: "public",
      created_at: "2026-05-01T00:15:00.000Z",
      updated_at: "2026-05-01T00:15:00.000Z",
      permalink_url: "https://annotated.example/a/ann_text_density",
      engagement: {
        likes: 18,
        reposts: 2,
        discussions: 3,
        viewer_has_liked: true
      }
    },
    {
      id: "ann_audio_edge",
      author_id: "usr_ika",
      author: {
        id: "usr_ika",
        handle: "ika",
        display_name: "Ika Morris",
        avatar_url:
          "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=160&q=80",
        bio: "Backend engineer mapping serverless tradeoffs."
      },
      clip: {
        kind: "audio",
        source: {
          source_url: "https://example.fm/episodes/edge-computing-for-products",
          source_domain: "example.fm",
          title: "Edge Computing for Product Teams",
          author_name: "Edge Notes"
        },
        media: {
          start_seconds: 772,
          end_seconds: 835,
          duration_seconds: 63
        }
      },
      commentary: {
        kind: "text",
        text: "This explanation makes the case for service bindings better than a diagram: the public contract can stay boring while internals evolve."
      },
      visibility: "public",
      created_at: "2026-05-01T00:32:00.000Z",
      updated_at: "2026-05-01T00:32:00.000Z",
      permalink_url: "https://annotated.example/a/ann_audio_edge",
      engagement: {
        likes: 25,
        reposts: 5,
        discussions: 4,
        viewer_has_liked: false
      }
    }
  ] satisfies AnnotationResource[]
};

export function createRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

export function toSourceDomain(sourceUrl: string): string {
  return new URL(sourceUrl).hostname.replace(/^www\./, "");
}
