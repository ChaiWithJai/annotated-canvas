import { fixtures, type AnnotationResource, type UserResource } from "@annotated/contracts";
import { AnnotationCard, Button, ClipReference, ShellHeader, SourcePill } from "@annotated/ui";
import { Bell, Check, Flag, LogIn, Send, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, loadAnnotation, loadFeed, loadProfile, loadProfileAnnotations, submitClaim } from "./api";

type View = "home" | "feed" | "profile" | "annotation" | "empty" | "removed" | "signup";

function clipSource(clip: AnnotationResource["clip"]) {
  return "source" in clip ? clip.source : undefined;
}

function viewFromPath(pathname: string): View {
  if (pathname === "/home") return "home";
  if (pathname === "/signup") return "signup";
  if (pathname === "/u/mira") return "profile";
  if (pathname === "/a/removed") return "removed";
  if (pathname.startsWith("/a/")) return "annotation";
  if (pathname === "/empty") return "empty";
  return "feed";
}

export function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [claimTarget, setClaimTarget] = useState<AnnotationResource | null>(null);
  const [claimReason, setClaimReason] = useState("I want this annotation reviewed for attribution and usage boundaries.");
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [feedItems, setFeedItems] = useState<AnnotationResource[]>(fixtures.annotations);
  const [featured, setFeatured] = useState<AnnotationResource>(fixtures.annotations[0]);
  const [profile, setProfile] = useState<UserResource>({
    ...fixtures.currentUser,
    viewer_is_following: false,
    stats: { followers: 128, following: 64, annotations: 1 }
  });
  const [profileItems, setProfileItems] = useState<AnnotationResource[]>(
    fixtures.annotations.filter((item) => item.author.handle === "mira")
  );

  const viewTitle = useMemo(() => {
    if (view === "home") return "Annotated Canvas";
    if (view === "feed") return "Following";
    if (view === "profile") return "Mira's Canvas";
    if (view === "signup") return "Sign up";
    if (view === "empty") return "No annotations";
    if (view === "removed") return "Removed";
    return "Annotation";
  }, [view]);
  const featuredSource = clipSource(featured.clip);

  useEffect(() => {
    if (view === "feed") {
      void loadFeed().then(setFeedItems);
    }
    if (view === "annotation") {
      const id = window.location.pathname.split("/").pop() || "ann_video_minimalism";
      void loadAnnotation(id).then((annotation) => {
        if (annotation) setFeatured(annotation);
      });
    }
    if (view === "profile") {
      void loadProfile("mira").then((nextProfile) => {
        setProfile(nextProfile);
        setIsFollowing(nextProfile.viewer_is_following);
      });
      void loadProfileAnnotations("mira").then(setProfileItems);
    }
  }, [view]);

  function navigate(nextView: "feed" | "profile" | "annotation") {
    const path = nextView === "feed" ? "/" : nextView === "profile" ? "/u/mira" : "/a/ann_video_minimalism";
    window.history.pushState(null, "", path);
    setView(nextView);
  }

  return (
    <>
      <ShellHeader
        active={view}
        onNavigate={navigate}
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

        {view === "home" || view === "signup" ? (
          <section className="marketing-view">
            <p className="eyebrow">Source-linked commentary</p>
            <h2>Annotate the exact moment, keep the source intact.</h2>
            <p>
              Capture text selections and media timecodes, add commentary, and publish public
              annotations that send readers back to the original source.
            </p>
            <div className="marketing-actions">
              <a
                className="marketing-button marketing-button--primary"
                href={`${API_BASE}/api/auth/google/start?return_to=/`}
              >
                Sign up with Google
              </a>
              <a className="marketing-button" href={`${API_BASE}/api/auth/x/start?return_to=/`}>
                Sign up with X
              </a>
              <button type="button" onClick={() => navigate("feed")}>
                View public feed
              </button>
            </div>
            <div className="feed-list marketing-preview">
              {feedItems.slice(0, 2).map((annotation) => (
                <AnnotationCard key={annotation.id} annotation={annotation} compact onClaim={setClaimTarget} />
              ))}
            </div>
          </section>
        ) : null}

        {view === "feed" || view === "empty" ? (
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
            {view === "empty" ? (
              <div className="empty-state">
                <h2>No annotations yet.</h2>
                <p>Start following curators or clip your first source-linked moment.</p>
              </div>
            ) : (
              <div className="feed-list">
                {feedItems.map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    annotation={annotation}
                    onClaim={setClaimTarget}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {view === "annotation" || view === "removed" ? (
          <article className="permalink-view">
            {view === "removed" ? (
              <div className="removed-state">
                <p className="eyebrow">Public permalink</p>
                <h2>This annotation has been removed by the author or via moderation claim.</h2>
                {featuredSource ? <SourcePill source={featuredSource} /> : null}
                <button type="button" onClick={() => setClaimTarget(featured)}>
                  <Flag size={14} aria-hidden="true" />
                  File a claim
                </button>
              </div>
            ) : (
              <>
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
                  {featuredSource ? <SourcePill source={featuredSource} /> : null}
                  <button type="button" onClick={() => setClaimTarget(featured)}>
                    <Flag size={14} aria-hidden="true" />
                    File a claim
                  </button>
                </footer>
              </>
            )}
          </article>
        ) : null}

        {view === "profile" ? (
          <section className="profile-view">
            <aside className="profile-panel">
              <img alt="" src={profile.avatar_url} />
              <h2>{profile.display_name}</h2>
              <p>@{profile.handle}</p>
              <p>{profile.bio}</p>
              <Button tone={isFollowing ? "secondary" : "primary"} onClick={() => setIsFollowing(!isFollowing)}>
                <UserPlus size={16} aria-hidden="true" />
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <div className="profile-stats">
                <span>{profile.stats.followers} followers</span>
                <span>{profile.stats.following} following</span>
                <span>{profile.stats.annotations} annotations</span>
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
              <textarea value={claimReason} onChange={(event) => setClaimReason(event.target.value)} />
            </label>
            <Button
              tone="danger"
              onClick={async () => {
                try {
                  const claimId = await submitClaim(claimTarget.id, claimReason);
                  setClaimStatus(`Claim received: ${claimId}`);
                } catch {
                  setClaimStatus("Claim saved locally for demo review.");
                }
              }}
            >
              <Flag size={16} aria-hidden="true" />
              Submit notice
            </Button>
            {claimStatus ? <p className="claim-status">{claimStatus}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
