import { fixtures, type AnnotationResource, type CommentResource, type UserResource } from "@annotated/contracts";
import { AnnotationCard, Button, ClipReference, ShellHeader, SourcePill } from "@annotated/ui";
import { Bell, Check, Flag, LogIn, Send, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  API_BASE,
  ApiRequestError,
  CLERK_CLIENT_CONFIGURED,
  loadCurrentViewer,
  loadAnnotation,
  loadComments,
  loadFeed,
  loadProfile,
  loadProfileAnnotations,
  publishWebAnnotation,
  sendEngagement,
  setFollow,
  startAuth,
  submitClaim,
  submitComment,
  type AuthProvider
} from "./api";

type View = "home" | "feed" | "profile" | "annotation" | "empty" | "removed" | "signup";
type ViewerState = "loading" | "signed-in" | "signed-out";
const REVIEWER_GUIDE_URL =
  "https://github.com/ChaiWithJai/annotated-canvas/blob/main/docs/reviewer-journey.md";

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

function parseSeconds(value: string): number {
  if (value.includes(":")) {
    const parts = value.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return 0;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [viewerState, setViewerState] = useState<ViewerState>("loading");
  const [viewer, setViewer] = useState<Pick<UserResource, "id" | "handle" | "display_name" | "avatar_url"> | null>(
    null
  );
  const [authPending, setAuthPending] = useState<AuthProvider | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [claimTarget, setClaimTarget] = useState<AnnotationResource | null>(null);
  const [claimReason, setClaimReason] = useState("Please review this annotation and its source usage.");
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [claimStatusId, setClaimStatusId] = useState<string | null>(null);
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
  const [comments, setComments] = useState<CommentResource[]>(fixtures.comments);
  const [commentBody, setCommentBody] = useState("This source moment changed how I read the surrounding piece.");
  const [commentStatus, setCommentStatus] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<"text" | "video">("text");
  const [sourceUrl, setSourceUrl] = useState("https://example.com/essays/calm-interface-density");
  const [sourceTitle, setSourceTitle] = useState("Calm Interface Density");
  const [quote, setQuote] = useState("A quiet interface is not an empty interface.");
  const [startTime, setStartTime] = useState("00:04:23");
  const [endTime, setEndTime] = useState("00:05:10");
  const [composerCommentary, setComposerCommentary] = useState(
    "This moment is worth saving because the source context makes the point stronger."
  );
  const [composerStatus, setComposerStatus] = useState<string | null>(null);

  const viewTitle = useMemo(() => {
    if (view === "home") return "Annotated Canvas";
    if (view === "feed") return "Public feed";
    if (view === "profile") return "Mira's Canvas";
    if (view === "signup") return "Sign up";
    if (view === "empty") return "No annotations";
    if (view === "removed") return "Removed";
    return "Annotation";
  }, [view]);
  const featuredSource = clipSource(featured.clip);

  useEffect(() => {
    let cancelled = false;

    void loadCurrentViewer()
      .then((session) => {
        if (cancelled) return;
        setViewer(session.user);
        setViewerState(session.user ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (cancelled) return;
        setViewer(null);
        setViewerState("signed-out");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (view === "feed") {
      void loadFeed().then(setFeedItems);
    }
    if (view === "annotation") {
      const id = window.location.pathname.split("/").pop() || "ann_video_minimalism";
      void loadAnnotation(id).then((annotation) => {
        if (annotation) setFeatured(annotation);
      });
      void loadComments(id).then(setComments);
    }
    if (view === "profile") {
      void loadProfile("mira").then((nextProfile) => {
        setProfile(nextProfile);
        setIsFollowing(nextProfile.viewer_is_following);
      });
      void loadProfileAnnotations("mira").then(setProfileItems);
    }
  }, [view]);

  function showAuthChoice() {
    setAuthError(null);
    window.history.pushState(null, "", "/signup");
    setView("signup");
  }

  function navigate(nextView: "feed" | "profile" | "annotation") {
    const path = nextView === "feed" ? "/" : nextView === "profile" ? "/u/mira" : "/a/ann_video_minimalism";
    window.history.pushState(null, "", path);
    setView(nextView);
  }

  function providerLabel(provider: AuthProvider) {
    return provider === "google" ? "Google" : "X";
  }

  function authErrorMessage(error: unknown, provider: AuthProvider) {
    if (error instanceof ApiRequestError) {
      if (error.code === "clerk_client_not_configured") {
        return "Sign-in setup is pending.";
      }

      const configuredError =
        error.code?.includes("not_configured") || error.message.toLowerCase().includes("configured");
      return configuredError ? `${providerLabel(provider)} sign-in is not configured yet.` : error.message;
    }

    return `Could not start ${providerLabel(provider)} sign-in.`;
  }

  async function handleAuthStart(provider: AuthProvider) {
    setAuthError(null);
    setAuthPending(provider);

    try {
      const authorizationUrl = await startAuth(provider, window.location.href);
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      }
    } catch (error) {
      setAuthError(authErrorMessage(error, provider));
    } finally {
      setAuthPending(null);
    }
  }

  function replaceAnnotation(next: AnnotationResource) {
    setFeatured((current) => (current.id === next.id ? next : current));
    setFeedItems((items) => items.map((item) => (item.id === next.id ? next : item)));
    setProfileItems((items) => items.map((item) => (item.id === next.id ? next : item)));
  }

  async function handleEngage(annotation: AnnotationResource, type: "like" | "repost" | "discuss") {
    try {
      replaceAnnotation(await sendEngagement(annotation.id, type));
    } catch {
      replaceAnnotation({
        ...annotation,
        engagement: {
          ...annotation.engagement,
          likes: type === "like" ? annotation.engagement.likes + 1 : annotation.engagement.likes,
          reposts: type === "repost" ? annotation.engagement.reposts + 1 : annotation.engagement.reposts,
          discussions: type === "discuss" ? annotation.engagement.discussions + 1 : annotation.engagement.discussions
        }
      });
    }
  }

  async function submitComposer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComposerStatus("Publishing...");
    const startSeconds = parseSeconds(startTime);
    const endSeconds = parseSeconds(endTime);

    try {
      const annotation = await publishWebAnnotation({
        sourceUrl,
        title: sourceTitle,
        mode: composerMode,
        quote,
        startSeconds,
        endSeconds,
        commentary: composerCommentary
      });
      setFeedItems((items) => [annotation, ...items.filter((item) => item.id !== annotation.id)]);
      setFeatured(annotation);
      setComposerStatus("Published to the public feed.");
    } catch (error) {
      setComposerStatus(
        error instanceof Error && error.message.includes("validation")
          ? "Check the source URL, commentary, and time range."
          : "Could not publish from web composer. Confirm the API is running."
      );
    }
  }

  async function submitPermalinkComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommentStatus("Posting...");
    try {
      const comment = await submitComment(featured.id, commentBody);
      setComments((items) => [...items.filter((item) => item.id !== comment.id), comment]);
      setCommentBody("");
      setCommentStatus("Comment posted.");
      replaceAnnotation({
        ...featured,
        engagement: {
          ...featured.engagement,
          discussions: featured.engagement.discussions + 1
        }
      });
    } catch {
      setCommentStatus("Could not post comment. Confirm the API is running.");
    }
  }

  async function handleFollowToggle() {
    const nextFollowing = !isFollowing;
    const followerDelta = nextFollowing ? 1 : -1;
    setIsFollowing(nextFollowing);
    setProfile((current) => ({
      ...current,
      viewer_is_following: nextFollowing,
      stats: {
        ...current.stats,
        followers: Math.max(0, current.stats.followers + followerDelta)
      }
    }));

    try {
      const nextProfile = await setFollow(profile.id, nextFollowing);
      setProfile(nextProfile);
      setIsFollowing(nextProfile.viewer_is_following);
    } catch {
      setIsFollowing(!nextFollowing);
      setProfile((current) => ({
        ...current,
        viewer_is_following: !nextFollowing,
        stats: {
          ...current.stats,
          followers: Math.max(0, current.stats.followers - followerDelta)
        }
      }));
    }
  }

  return (
    <>
      <ShellHeader
        active={view}
        onNavigate={navigate}
        actions={
          <div className="header-auth">
            <span className="header-auth__state" aria-live="polite">
              {viewerState === "loading"
                ? "Checking session"
                : viewer
                  ? `Signed in as @${viewer.handle}`
                  : "Signed out"}
            </span>
            {viewer ? null : (
              <Button tone="secondary" type="button" onClick={showAuthChoice}>
                <LogIn size={16} aria-hidden="true" />
                Sign in
              </Button>
            )}
          </div>
        }
      />

      <main className="web-shell">
        <aside className="rail rail--left" aria-label="Context">
          <p className="eyebrow">Annotated Canvas</p>
          <h1>{viewTitle}</h1>
          <p>
            Publish a source-linked quote, clip, or comment without hiding the original page.
          </p>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>Always linked</dd>
            </div>
            <div>
              <dt>Claims</dt>
              <dd>Review request</dd>
            </div>
            <div>
              <dt>Clip limit</dt>
              <dd>90 seconds max</dd>
            </div>
          </dl>
        </aside>

        {view === "home" || view === "signup" ? (
          <section className="marketing-view">
            <p className="eyebrow">Source-linked annotations</p>
            <h2>Save the exact moment. Keep the source one click away.</h2>
            <p>
              Capture a quote or short media range, add your take, and publish it with a link back
              to the original page.
            </p>
            <section className="journey-hero" aria-label="How the reviewer journey works">
              <div className="journey-copy">
                <p className="eyebrow">Cold traffic path</p>
                <h3>Browse first. Install only when you are ready to publish.</h3>
                <p>
                  Visitors can inspect the public feed and source links before touching Chrome
                  extension setup. Reviewers can then load the unpacked extension and publish from a
                  real source tab.
                </p>
                <div className="journey-metrics" aria-label="Product trust checks">
                  <span>Source links</span>
                  <span>90s clips</span>
                  <span>Claim flow</span>
                  <span>R2 audio</span>
                </div>
              </div>
              <figure className="journey-shot">
                <img
                  src="/audit-assets/selected-text-ready-to-publish.png"
                  alt="Annotated Canvas Chrome side panel with selected text ready to publish"
                />
                <figcaption>Local extension capture screen used in the reviewer path.</figcaption>
              </figure>
            </section>
            <div className="marketing-actions">
              {CLERK_CLIENT_CONFIGURED ? (
                <>
                  <button
                    type="button"
                    className="marketing-button marketing-button--primary"
                    onClick={() => void handleAuthStart("google")}
                    disabled={authPending !== null}
                  >
                    {authPending === "google" ? "Starting Google..." : "Sign in with Google"}
                  </button>
                  <button
                    type="button"
                    className="marketing-button"
                    onClick={() => void handleAuthStart("x")}
                    disabled={authPending !== null}
                  >
                    {authPending === "x" ? "Starting X..." : "Sign in with X"}
                  </button>
                </>
              ) : (
                <button type="button" className="marketing-button marketing-button--primary" disabled>
                  Sign-in setup pending
                </button>
              )}
              <button type="button" onClick={() => navigate("feed")}>
                View public feed
              </button>
              <a href={REVIEWER_GUIDE_URL} target="_blank" rel="noreferrer">
                Extension install guide
              </a>
            </div>
            {authError ? (
              <div className="auth-recovery" role="alert">
                <strong>{authError}</strong>
                <p>For review, load the unpacked extension and use the production API in Settings.</p>
                <div className="auth-recovery__actions">
                  <button type="button" onClick={() => navigate("feed")}>
                    View feed
                  </button>
                  <a href={REVIEWER_GUIDE_URL} target="_blank" rel="noreferrer">
                    Install extension
                  </a>
                </div>
              </div>
            ) : null}
            {!CLERK_CLIENT_CONFIGURED ? (
              <div className="auth-recovery" role="status">
                <strong>Sign-in setup is pending.</strong>
                <p>Public feed, permalink, extension capture, comments, claims, and audio storage are available while Clerk keys are installed.</p>
                <div className="auth-recovery__actions">
                  <button type="button" onClick={() => navigate("feed")}>
                    View feed
                  </button>
                  <a href={REVIEWER_GUIDE_URL} target="_blank" rel="noreferrer">
                    Install extension
                  </a>
                </div>
              </div>
            ) : null}
            <section className="review-path" aria-label="Reviewer path">
              <div>
                <p className="eyebrow">Review path</p>
                <h3>See the feed, load the extension, publish, return.</h3>
              </div>
              <ol className="review-path__steps">
                <li>
                  <span>1</span>
                  <p>Open the public feed and inspect a source-linked annotation.</p>
                </li>
                <li>
                  <span>2</span>
                  <p>Build dist/extension, load it unpacked, and save the production API URL.</p>
                </li>
                <li>
                  <span>3</span>
                  <p>Publish from a source tab, then verify permalink, comments, and claims.</p>
                </li>
              </ol>
            </section>
            <section className="journey-return" aria-label="Return path proof">
              <img
                src="/audit-assets/selected-text-published.png"
                alt="Annotated Canvas Chrome side panel showing a published selected-text annotation"
              />
              <div>
                <p className="eyebrow">Return point</p>
                <h3>The side panel gives the annotation id after publish.</h3>
                <p>That id resolves on the web feed and permalink, where the source link and claim action stay visible.</p>
              </div>
            </section>
            <div className="feed-list marketing-preview">
              {feedItems.slice(0, 2).map((annotation) => (
                <AnnotationCard
                  key={annotation.id}
                  annotation={annotation}
                  compact
                  onClaim={setClaimTarget}
                  onEngage={handleEngage}
                />
              ))}
            </div>
          </section>
        ) : null}

        {view === "feed" || view === "empty" ? (
          <section className="feed-view" aria-label="Global feed">
            <div className="feed-toolbar">
              <div>
                <p className="eyebrow">Latest annotations</p>
                <h2>Public feed</h2>
              </div>
            </div>
            <form className="composer" onSubmit={submitComposer}>
              <div className="composer__header">
                <div>
                  <p className="eyebrow">Create</p>
                  <h3>Create an annotation</h3>
                </div>
                <fieldset className="composer__mode">
                  <legend>What are you saving?</legend>
                  <button
                    type="button"
                    className={composerMode === "text" ? "is-active" : ""}
                    onClick={() => setComposerMode("text")}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={composerMode === "video" ? "is-active" : ""}
                    onClick={() => setComposerMode("video")}
                  >
                    Time range
                  </button>
                </fieldset>
              </div>
              <div className="composer__grid">
                <label>
                  Source URL
                  <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
                </label>
                <label>
                  Source title
                  <input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} />
                </label>
              </div>
              {composerMode === "text" ? (
                <label>
                  Selected text
                  <textarea value={quote} onChange={(event) => setQuote(event.target.value)} />
                </label>
              ) : (
                <div className="composer__grid composer__grid--time">
                  <label>
                    IN
                    <input value={startTime} onChange={(event) => setStartTime(event.target.value)} inputMode="numeric" />
                  </label>
                  <label>
                    OUT
                    <input value={endTime} onChange={(event) => setEndTime(event.target.value)} inputMode="numeric" />
                  </label>
                </div>
              )}
              <label>
                Your note
                <textarea
                  value={composerCommentary}
                  onChange={(event) => setComposerCommentary(event.target.value)}
                />
              </label>
              <div className="composer__footer">
                <Button tone="primary">
                  <Send size={16} aria-hidden="true" />
                  Publish annotation
                </Button>
                {composerStatus ? <span>{composerStatus}</span> : null}
              </div>
            </form>
            {view === "empty" ? (
              <div className="empty-state">
                <h2>No annotations yet.</h2>
                <p>Create the first source-linked annotation above.</p>
              </div>
            ) : (
              <div className="feed-list">
                {feedItems.map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    annotation={annotation}
                    onClaim={setClaimTarget}
                    onEngage={handleEngage}
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
                <p className="eyebrow">Annotation page</p>
                <h2>This annotation has been removed by the author or via moderation claim.</h2>
                {featuredSource ? <SourcePill source={featuredSource} /> : null}
                <button type="button" onClick={() => setClaimTarget(featured)}>
                  <Flag size={14} aria-hidden="true" />
                  File a claim
                </button>
              </div>
            ) : (
              <>
                <p className="eyebrow">Annotation page</p>
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
                <section className="comments-panel" aria-label="Comments">
                  <div className="comments-panel__header">
                    <p className="eyebrow">Discussion</p>
                    <span>{comments.length} comments</span>
                  </div>
                  <div className="comments-list">
                    {comments.length ? (
                      comments.map((comment) => (
                        <article key={comment.id} className="comment">
                          <strong>{comment.author.display_name}</strong>
                          <p>{comment.body}</p>
                        </article>
                      ))
                    ) : (
                      <p className="comments-empty">No comments yet.</p>
                    )}
                  </div>
                  <form className="comment-form" onSubmit={submitPermalinkComment}>
                    <label>
                      Add a comment
                      <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
                    </label>
                    <div className="composer__footer">
                      <Button tone="primary">Post comment</Button>
                      {commentStatus ? <span>{commentStatus}</span> : null}
                    </div>
                  </form>
                </section>
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
              <Button tone={isFollowing ? "secondary" : "primary"} onClick={handleFollowToggle}>
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
                  onEngage={handleEngage}
                />
              ))}
            </div>
          </section>
        ) : null}

        <aside className="rail rail--right" aria-label="System status">
          <p className="eyebrow">Trust checks</p>
          {[
            "Original source is always linked",
            "Clips stop at 90 seconds",
            "Unpacked extension supported for review",
            "Claims ask for human review",
            "Retries do not duplicate posts"
          ].map((item) => (
            <div className="gate" key={item}>
              <Check size={15} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
          <div className="notify">
            <Bell size={18} aria-hidden="true" />
            <p>Google/X sign-in needs provider credentials; review can continue with the feed and unpacked extension.</p>
          </div>
        </aside>
      </main>

      {claimTarget ? (
        <div className="modal-backdrop" role="presentation">
          <section className="claim-modal" role="dialog" aria-modal="true" aria-label="File a claim">
            <header>
              <div>
                <p className="eyebrow">Rights notice</p>
                <h2>Ask for a review</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClaimTarget(null);
                  setClaimStatus(null);
                  setClaimStatusId(null);
                }}
              >
                Close
              </button>
            </header>
            <p>
              Tell us what needs review. We record the request and keep the annotation visible until
              a reviewer acts.
            </p>
            {clipSource(claimTarget.clip) ? <SourcePill source={clipSource(claimTarget.clip)!} /> : null}
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
                  setClaimStatusId(claimId);
                  setClaimStatus(`Claim received: ${claimId}`);
                } catch {
                  setClaimStatusId(null);
                  setClaimStatus("Claim saved locally for demo review.");
                }
              }}
            >
              <Flag size={16} aria-hidden="true" />
              Submit review request
            </Button>
            {claimStatus ? <p className="claim-status">{claimStatus}</p> : null}
            {claimStatusId ? (
              <a className="claim-status-link" href={`${API_BASE}/api/claims/${claimStatusId}`} target="_blank" rel="noreferrer">
                View claim status
              </a>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
