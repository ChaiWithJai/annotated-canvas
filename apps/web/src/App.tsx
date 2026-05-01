import { fixtures, type AnnotationResource } from "@annotated/contracts";
import { AnnotationCard, Button, ClipReference, ShellHeader, SourcePill } from "@annotated/ui";
import { Bell, Check, Flag, LogIn, Send, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

type View = "feed" | "profile" | "annotation";

export function App() {
  const [view, setView] = useState<View>("feed");
  const [claimTarget, setClaimTarget] = useState<AnnotationResource | null>(null);
  const featured = fixtures.annotations[0];
  const profileItems = fixtures.annotations.filter((item) => item.author.handle === "mira");

  const viewTitle = useMemo(() => {
    if (view === "feed") return "Following";
    if (view === "profile") return "Mira's Canvas";
    return "Annotation";
  }, [view]);

  return (
    <>
      <ShellHeader
        active={view}
        onNavigate={setView}
        actions={
          <Button tone="secondary">
            <LogIn size={16} aria-hidden="true" />
            Continue
          </Button>
        }
      />

      <main className="web-shell">
        <aside className="rail rail--left" aria-label="Context">
          <p className="eyebrow">Annotated Canvas</p>
          <h1>{viewTitle}</h1>
          <p>
            Clip exact source moments, publish commentary, and preserve the original traffic path.
          </p>
          <dl>
            <div>
              <dt>References</dt>
              <dd>By source URL</dd>
            </div>
            <div>
              <dt>Claims</dt>
              <dd>Notice workflow</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>Clip-by-reference</dd>
            </div>
          </dl>
        </aside>

        {view === "feed" ? (
          <section className="feed-view" aria-label="Global feed">
            <div className="feed-toolbar">
              <div>
                <p className="eyebrow">Recent public annotations</p>
                <h2>Following feed</h2>
              </div>
              <Button tone="primary">
                <Send size={16} aria-hidden="true" />
                New annotation
              </Button>
            </div>
            <div className="feed-list">
              {fixtures.annotations.map((annotation) => (
                <AnnotationCard
                  key={annotation.id}
                  annotation={annotation}
                  onClaim={setClaimTarget}
                />
              ))}
            </div>
          </section>
        ) : null}

        {view === "annotation" ? (
          <article className="permalink-view">
            <p className="eyebrow">Public permalink</p>
            <h2>
              {featured.commentary.kind === "text" ? featured.commentary.text : "Audio commentary"}
            </h2>
            <ClipReference clip={featured.clip} />
            <footer className="permalink-meta">
              <div>
                <img alt="" src={featured.author.avatar_url} />
                <div>
                  <strong>{featured.author.display_name}</strong>
                  <span>@{featured.author.handle} · May 1, 2026</span>
                </div>
              </div>
              {"source" in featured.clip ? <SourcePill source={featured.clip.source} /> : null}
              <button type="button" onClick={() => setClaimTarget(featured)}>
                <Flag size={14} aria-hidden="true" />
                File a claim
              </button>
            </footer>
          </article>
        ) : null}

        {view === "profile" ? (
          <section className="profile-view">
            <aside className="profile-panel">
              <img alt="" src={fixtures.currentUser.avatar_url} />
              <h2>{fixtures.currentUser.display_name}</h2>
              <p>@{fixtures.currentUser.handle}</p>
              <p>{fixtures.currentUser.bio}</p>
              <Button tone="primary">
                <UserPlus size={16} aria-hidden="true" />
                Follow
              </Button>
              <div className="profile-stats">
                <span>128 followers</span>
                <span>64 following</span>
              </div>
            </aside>
            <div className="profile-list">
              {(profileItems.length ? profileItems : fixtures.annotations).map((annotation) => (
                <AnnotationCard
                  key={annotation.id}
                  annotation={annotation}
                  compact
                  onClaim={setClaimTarget}
                />
              ))}
            </div>
          </section>
        ) : null}

        <aside className="rail rail--right" aria-label="System status">
          <p className="eyebrow">MVP gates</p>
          {[
            "source_url enforced",
            "90 second media cap",
            "X/Google OAuth only",
            "claim notice flow",
            "idempotent publish"
          ].map((item) => (
            <div className="gate" key={item}>
              <Check size={15} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
          <div className="notify">
            <Bell size={18} aria-hidden="true" />
            <p>Cloudflare services run behind the public REST contract.</p>
          </div>
        </aside>
      </main>

      {claimTarget ? (
        <div className="modal-backdrop" role="presentation">
          <section className="claim-modal" role="dialog" aria-modal="true" aria-label="File a claim">
            <header>
              <div>
                <p className="eyebrow">Rights notice</p>
                <h2>File a claim</h2>
              </div>
              <button type="button" onClick={() => setClaimTarget(null)}>
                Close
              </button>
            </header>
            <p>
              This opens a notice workflow for <strong>{claimTarget.id}</strong>. Annotated records the
              claim and routes it for review; it does not decide fair use automatically.
            </p>
            <label>
              Relationship
              <select defaultValue="copyright-owner">
                <option value="copyright-owner">Copyright owner</option>
                <option value="authorized-agent">Authorized agent</option>
                <option value="creator">Creator</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Reason
              <textarea defaultValue="I want this annotation reviewed for attribution and usage boundaries." />
            </label>
            <Button tone="danger">
              <Flag size={16} aria-hidden="true" />
              Submit notice
            </Button>
          </section>
        </div>
      ) : null}
    </>
  );
}
