import { SourceRefSchema, toSourceDomain } from "@annotated/contracts";
import { Button, SourcePill } from "@annotated/ui";
import {
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Mic,
  RotateCcw,
  Save,
  Scissors,
  Send,
  Settings,
  Square,
  UserCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_API_BASE,
  PRODUCTION_API_BASE,
  readApiBase,
  publishAnnotation,
  readActiveTabContext,
  readCaptureDraft,
  readPendingCapture,
  saveApiBase,
  saveCaptureDraft,
  type CaptureDraft,
  type PublishAnnotationResult,
  type PageCaptureContext
} from "./api";

type CaptureMode = "context" | "drafts" | "annotations" | "settings";

const fallbackUrl = "https://www.youtube.com/watch?v=annotated-demo&t=263s";
const sidePanelTabs = [
  { id: "context", label: "Capture", Icon: Scissors },
  { id: "drafts", label: "Drafts", Icon: FileText },
  { id: "annotations", label: "Published", Icon: Layers },
  { id: "settings", label: "Settings", Icon: Settings }
] satisfies Array<{ id: CaptureMode; label: string; Icon: typeof Scissors }>;

export function SidePanel() {
  const [mode, setMode] = useState<CaptureMode>("context");
  const [commentary, setCommentary] = useState("");
  const [captureKind, setCaptureKind] = useState<"video" | "text">("video");
  const [commentaryMode, setCommentaryMode] = useState<"text" | "audio">("text");
  const [startTime, setStartTime] = useState("00:04:23");
  const [endTime, setEndTime] = useState("00:05:10");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "publishing" | "published">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<PageCaptureContext | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<CaptureDraft | null>(null);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [publishedAnnotation, setPublishedAnnotation] = useState<PublishAnnotationResult["annotation"] | null>(
    null
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const source = useMemo(
    () =>
      SourceRefSchema.parse({
        source_url: pageContext?.source_url ?? fallbackUrl,
        source_domain: toSourceDomain(pageContext?.source_url ?? fallbackUrl),
        title: pageContext?.title || "Minimalist Design Theory: A Comprehensive Guide",
        favicon_url:
          pageContext?.source_url && pageContext.source_url !== fallbackUrl
            ? undefined
            : "https://www.youtube.com/s/desktop/28b0985e/img/favicon_32x32.png"
      }),
    [pageContext]
  );

  useEffect(() => {
    void Promise.all([readPendingCapture(), readActiveTabContext()]).then(([pending, active]) => {
      const nextContext = pending ?? active;
      if (nextContext) {
        setPageContext(nextContext);
        if (nextContext.selection_text) setCaptureKind("text");
        if (nextContext.media?.current_time != null) {
          const start = Math.max(0, Math.floor(nextContext.media.current_time));
          setStartTime(formatTimeInput(start));
          setEndTime(formatTimeInput(start + 47));
        }
      }
    });
  }, []);

  useEffect(() => {
    void readApiBase().then(setApiBaseUrl);
    void readCaptureDraft().then(setSavedDraft);
  }, []);

  function parseTimeInput(value: string): number {
    if (value.includes(":")) {
      const parts = value.split(":").map((part) => Number(part));
      if (parts.some((part) => Number.isNaN(part))) return 0;
      return parts.reduce((total, part) => total * 60 + part, 0);
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function formatTimeInput(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  async function toggleRecording() {
    setError(null);
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording is not available in this browser context.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
      setCommentaryMode("audio");
    } catch {
      setError("Microphone permission was blocked.");
    }
  }

  async function publish() {
    setStatus("publishing");
    setError(null);
    setPublishedAnnotation(null);
    try {
      const startSeconds = parseTimeInput(startTime);
      const endSeconds = parseTimeInput(endTime);
      if (captureKind === "video" && endSeconds <= startSeconds) {
        throw new Error("invalid_range");
      }
      if (captureKind === "video" && endSeconds - startSeconds > 90) {
        throw new Error("range_too_long");
      }
      const result = await publishAnnotation({
        context: pageContext ?? {},
        commentary,
        captureKind,
        range: { start_seconds: startSeconds, end_seconds: endSeconds },
        audioBlob: commentaryMode === "audio" ? audioBlob : null
      });
      setPublishedAnnotation(result.annotation);
      setStatus("published");
      setMode("annotations");
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error && caught.message === "range_too_long"
          ? "Clip length must be 90 seconds or less."
          : caught instanceof Error && caught.message === "invalid_range"
            ? "End time must be after start time."
          : "Could not publish. Confirm the API URL in Settings."
      );
    }
  }

  async function saveSettings() {
    setSettingsStatus("Saving...");
    const nextApiBase = await saveApiBase(apiBaseUrl);
    setApiBaseUrl(nextApiBase);
    setSettingsStatus("Saved.");
  }

  async function saveDraft() {
    const startSeconds = parseTimeInput(startTime);
    const endSeconds = parseTimeInput(endTime);
    const nextDraft = await saveCaptureDraft({
      context: pageContext ?? {},
      commentary,
      captureKind,
      range: { start_seconds: startSeconds, end_seconds: endSeconds }
    });
    setSavedDraft(nextDraft);
    setDraftStatus("Draft saved locally.");
  }

  function restoreDraft(draft: CaptureDraft) {
    setPageContext(draft.context);
    setCaptureKind(draft.captureKind);
    setCommentary(draft.commentary);
    if (draft.range) {
      setStartTime(formatTimeInput(draft.range.start_seconds));
      setEndTime(formatTimeInput(draft.range.end_seconds));
    }
    setMode("context");
    setDraftStatus("Draft restored.");
  }

  return (
    <main className="sidepanel-shell">
      <header className="sidepanel-header">
        <div className="sidepanel-avatar" aria-hidden="true">
          AC
        </div>
        <div>
          <h1>Annotated Canvas</h1>
          <p>Capture from this tab</p>
        </div>
      </header>

      <nav className="sidepanel-tabs" aria-label="Side panel">
        {sidePanelTabs.map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            className={mode === id ? "is-active" : ""}
            onClick={() => setMode(id)}
            title={label}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {mode === "context" ? (
        <section className="capture-pane">
          <SourcePill source={source} />

          <fieldset className="segmented">
            <legend>What are you saving?</legend>
            <button
              type="button"
              className={captureKind === "video" ? "is-active" : ""}
              onClick={() => setCaptureKind("video")}
            >
              <Clock size={15} aria-hidden="true" />
              Time range
            </button>
            <button
              type="button"
              className={captureKind === "text" ? "is-active" : ""}
              onClick={() => setCaptureKind("text")}
            >
              <FileText size={15} aria-hidden="true" />
              Selected text
            </button>
          </fieldset>

          {captureKind === "video" ? (
            <div className="timecode-grid">
              <label>
                Start
                <input value={startTime} onChange={(event) => setStartTime(event.target.value)} inputMode="numeric" />
              </label>
              <span aria-hidden="true">-</span>
              <label>
                End
                <input value={endTime} onChange={(event) => setEndTime(event.target.value)} inputMode="numeric" />
              </label>
            </div>
          ) : (
            <blockquote className="selection-preview">
              {pageContext?.selection_text ||
                "A quiet interface is not an empty interface. It is an interface where every visible thing has earned its place."}
            </blockquote>
          )}

          <label className="commentary-field">
            <span>Your note</span>
            <textarea
              placeholder="Add your take..."
              value={commentary}
              onChange={(event) => setCommentary(event.target.value)}
            />
          </label>
          <div className="audio-row">
            <button
              type="button"
              className={commentaryMode === "audio" ? "is-active" : ""}
              onClick={toggleRecording}
            >
              {recording ? <Square size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
              {recording ? "Stop recording" : audioBlob ? "Record again" : "Record voice note"}
            </button>
            {audioBlob ? <span>Voice note ready</span> : null}
          </div>
          <div className="draft-actions">
            <Button tone="secondary" type="button" onClick={saveDraft}>
              <Save size={15} aria-hidden="true" />
              Save draft
            </Button>
            {draftStatus ? <span>{draftStatus}</span> : null}
          </div>
        </section>
      ) : mode === "settings" ? (
        <section className="settings-pane">
          <label>
            API URL
            <input
              value={apiBaseUrl}
              onChange={(event) => {
                setApiBaseUrl(event.target.value);
                setSettingsStatus(null);
              }}
              placeholder="http://localhost:8787"
              inputMode="url"
            />
          </label>
          <div className="preset-row" aria-label="API presets">
            <button type="button" onClick={() => setApiBaseUrl(DEFAULT_API_BASE)}>
              Local
            </button>
            <button type="button" onClick={() => setApiBaseUrl(PRODUCTION_API_BASE)}>
              Production
            </button>
          </div>
          <p>Use localhost for local testing or the deployed Worker URL for review.</p>
          <Button tone="secondary" onClick={saveSettings}>
            Save settings
          </Button>
          {settingsStatus ? <span>{settingsStatus}</span> : null}
        </section>
      ) : mode === "drafts" ? (
        <section className="draft-pane">
          {savedDraft ? (
            <article className="draft-card">
              <div>
                <strong>{savedDraft.context.title || "Untitled source"}</strong>
                <span>{savedDraft.captureKind === "text" ? "Selected text" : "Time range"}</span>
              </div>
              <p>{savedDraft.commentary || "No commentary yet."}</p>
              <Button tone="secondary" type="button" onClick={() => restoreDraft(savedDraft)}>
                <RotateCcw size={15} aria-hidden="true" />
                Restore draft
              </Button>
            </article>
          ) : (
            <p>No local draft saved yet.</p>
          )}
        </section>
      ) : (
        <section className="published-pane">
          {publishedAnnotation ? (
            <article className="published-card">
              <div>
                <strong>Last publish</strong>
                <span>{publishedAnnotation.id}</span>
              </div>
              <dl>
                <div>
                  <dt>Permalink</dt>
                  <dd>
                    <a href={publishedAnnotation.permalink_url} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} aria-hidden="true" />
                      Open permalink
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{publishedAnnotation.clip.source?.source_url ?? "Uploaded source"}</dd>
                </div>
              </dl>
            </article>
          ) : (
            <p>Published items appear in the API feed after publish.</p>
          )}
        </section>
      )}

      <footer className="sidepanel-footer">
        {error ? <p className="sidepanel-error">{error}</p> : null}
        <div className="sync-row">
          <UserCircle size={16} aria-hidden="true" />
          <span>Signed out: production publishes use the demo API author until extension OAuth handoff lands.</span>
        </div>
        <Button tone="primary" onClick={publish} disabled={status === "publishing"}>
          <Send size={16} aria-hidden="true" />
          {status === "publishing"
            ? "Publishing..."
            : status === "published"
              ? "Published"
              : "Publish annotation"}
        </Button>
      </footer>
    </main>
  );
}
