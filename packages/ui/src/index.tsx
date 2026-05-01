import type { AnnotationResource, ClipRef, SourceRef } from "@annotated/contracts";
import {
  ExternalLink,
  Flag,
  Heart,
  MessageCircle,
  Play,
  Quote,
  Repeat2,
  Timer
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function formatTimecode(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function Button({
  children,
  tone = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button className={`ac-button ac-button--${tone}`} {...props}>
      {children}
    </button>
  );
}

export function SourcePill({ source, label = "Original source" }: { source: SourceRef; label?: string }) {
  return (
    <a
      className="source-pill"
      href={source.source_url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label}: ${source.title}`}
      title={`${label}: ${source.title}`}
    >
      {source.favicon_url ? <img alt="" src={source.favicon_url} /> : <ExternalLink size={13} />}
      <strong>{label}</strong>
      <span>{source.source_domain}</span>
      <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

function ClipKindIcon({ clip }: { clip: ClipRef }) {
  if (clip.kind === "text") return <Quote size={18} aria-hidden="true" />;
  if (clip.kind === "upload") return <Play size={18} aria-hidden="true" />;
  return <Timer size={18} aria-hidden="true" />;
}

export function ClipReference({ clip }: { clip: ClipRef }) {
  const source = "source" in clip ? clip.source : undefined;

  return (
    <section className="clip-reference" aria-label="Referenced clip">
      <div className="clip-reference__header">
        <ClipKindIcon clip={clip} />
        <div>
          <p>{source?.title ?? "User-owned media"}</p>
          {source ? <SourcePill source={source} /> : null}
        </div>
      </div>

      {clip.kind === "text" ? (
        <blockquote className="clip-reference__quote">{clip.text.quote}</blockquote>
      ) : null}

      {clip.kind === "video" || clip.kind === "audio" ? (
        <div className="clip-reference__media">
          <div className="clip-reference__timeline" aria-hidden="true">
            <span style={{ left: "18%", width: "42%" }} />
          </div>
          <div className="clip-reference__timecodes">
            <span>IN {formatTimecode(clip.media.start_seconds)}</span>
            <span>OUT {formatTimecode(clip.media.end_seconds)}</span>
            <span>{clip.media.duration_seconds}s clip</span>
          </div>
        </div>
      ) : null}

      {clip.kind === "upload" ? (
        <p className="clip-reference__upload">Creator-owned upload: {clip.upload.asset_id}</p>
      ) : null}
    </section>
  );
}

export function AnnotationCard({
  annotation,
  onClaim,
  onEngage,
  compact = false
}: {
  annotation: AnnotationResource;
  onClaim?: (annotation: AnnotationResource) => void;
  onEngage?: (annotation: AnnotationResource, type: "like" | "repost" | "discuss") => void;
  compact?: boolean;
}) {
  const commentary = annotation.commentary.kind === "text" ? annotation.commentary.text : "Audio commentary";

  return (
    <article className={`annotation-card ${compact ? "annotation-card--compact" : ""}`}>
      <header className="annotation-card__header">
        {annotation.author.avatar_url ? <img alt="" src={annotation.author.avatar_url} /> : null}
        <div>
          <p>{annotation.author.display_name}</p>
          <span>@{annotation.author.handle}</span>
        </div>
        <time>{new Date(annotation.created_at).toLocaleDateString()}</time>
      </header>

      <ClipReference clip={annotation.clip} />

      <p className="annotation-card__commentary">{commentary}</p>

      <footer className="annotation-card__footer">
          <button type="button" onClick={() => onEngage?.(annotation, "like")} aria-label="Like annotation">
            <Heart size={15} aria-hidden="true" /> {annotation.engagement.likes}
          </button>
        <button type="button" onClick={() => onEngage?.(annotation, "repost")} aria-label="Repost annotation">
          <Repeat2 size={15} aria-hidden="true" /> {annotation.engagement.reposts}
        </button>
        <button type="button" onClick={() => onEngage?.(annotation, "discuss")} aria-label="Comment on annotation">
          <MessageCircle size={15} aria-hidden="true" /> {annotation.engagement.discussions}
        </button>
        {onClaim ? (
          <button type="button" className="annotation-card__claim" onClick={() => onClaim(annotation)}>
            <Flag size={14} aria-hidden="true" />
            File a claim
          </button>
        ) : null}
      </footer>
    </article>
  );
}

export function ShellHeader({
  active,
  onNavigate,
  actions
}: {
  active: string;
  onNavigate: (view: "feed" | "profile" | "annotation") => void;
  actions?: ReactNode;
}) {
  return (
    <header className="shell-header">
      <button type="button" className="shell-header__brand" onClick={() => onNavigate("feed")}>
        Annotated Canvas
      </button>
      <nav aria-label="Primary">
        {(["feed", "profile", "annotation"] as const).map((view) => (
          <button
            type="button"
            key={view}
            className={active === view ? "is-active" : ""}
            onClick={() => onNavigate(view)}
          >
            {view === "annotation" ? "Annotation" : view[0].toUpperCase() + view.slice(1)}
          </button>
        ))}
      </nav>
      <div className="shell-header__actions">{actions}</div>
    </header>
  );
}
