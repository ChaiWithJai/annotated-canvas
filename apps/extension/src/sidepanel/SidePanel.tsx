import { SourceRefSchema, toSourceDomain } from "@annotated/contracts";
import { Button, SourcePill } from "@annotated/ui";
import { Clock, FileText, Layers, Mic, Scissors, Send, Settings, Square, UserCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  publishAnnotation,
  readActiveTabContext,
  readPendingCapture,
  type PageCaptureContext
} from "./api";

type CaptureMode = "context" | "drafts" | "annotations" | "settings";

const fallbackUrl = "https://www.youtube.com/watch?v=annotated-demo&t=263s";

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
    try {
      const startSeconds = parseTimeInput(startTime);
      const endSeconds = parseTimeInput(endTime);
      if (captureKind === "video" && endSeconds - startSeconds > 90) {
        throw new Error("range_too_long");
      }
      await publishAnnotation({
        context: pageContext ?? {},
        commentary,
        captureKind,
        range: { start_seconds: startSeconds, end_seconds: endSeconds },
        audioBlob: commentaryMode === "audio" ? audioBlob : null
      });
      setStatus("published");
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error && caught.message === "range_too_long"
          ? "Clip length must be 90 seconds or less."
          : "Could not publish. Confirm the local API is running on port 8787."
      );
    }
  }

  return (
    <main className="sidepanel-shell">
      <header className="sidepanel-header">
        <div className="sidepanel-avatar" aria-hidden="true">
          AC
        </div>
        <div>
          <h1>AnnotatedCanvas</h1>
          <p>Extension</p>
        </div>
      </header>

      <nav className="sidepanel-tabs" aria-label="Side panel">
        {[
          ["context", Scissors],
          ["drafts", FileText],
          ["annotations", Layers],
          ["settings", Settings]
        ].map(([tab, Icon]) => (
          <button
            type="button"
            key={tab as string}
            className={mode === tab ? "is-active" : ""}
            onClick={() => setMode(tab as CaptureMode)}
            title={String(tab)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{String(tab).toUpperCase()}</span>
          </button>
        ))}
      </nav>

      {mode === "context" ? (
        <section className="capture-pane">
          <SourcePill source={source} />

          <fieldset className="segmented">
            <legend>Capture type</legend>
            <button
              type="button"
              className={captureKind === "video" ? "is-active" : ""}
              onClick={() => setCaptureKind("video")}
            >
              <Clock size={15} aria-hidden="true" />
              Timecode
            </button>
            <button
              type="button"
              className={captureKind === "text" ? "is-active" : ""}
              onClick={() => setCaptureKind("text")}
            >
              <FileText size={15} aria-hidden="true" />
              Text
            </button>
          </fieldset>

          {captureKind === "video" ? (
            <div className="timecode-grid">
              <label>
                IN
                <input value={startTime} onChange={(event) => setStartTime(event.target.value)} inputMode="numeric" />
              </label>
              <span aria-hidden="true">-</span>
              <label>
                OUT
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
            <span>Commentary</span>
            <textarea
              placeholder="Add your perspective..."
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
              {recording ? "Stop recording" : audioBlob ? "Re-record audio" : "Record audio"}
            </button>
            {audioBlob ? <span>{Math.ceil(audioBlob.size / 1024)} KB ready</span> : null}
          </div>
        </section>
      ) : (
        <section className="empty-pane">
          <p>{mode === "settings" ? "Connect account sync and provider settings." : "No saved items yet."}</p>
        </section>
      )}

      <footer className="sidepanel-footer">
        {error ? <p className="sidepanel-error">{error}</p> : null}
        <div className="sync-row">
          <span>Connect accounts for sync:</span>
          <UserCircle size={16} aria-hidden="true" />
        </div>
        <Button tone="primary" onClick={publish} disabled={status === "publishing"}>
          <Send size={16} aria-hidden="true" />
          {status === "publishing"
            ? "Publishing..."
            : status === "published"
              ? "Published"
              : "Publish to Canvas"}
        </Button>
      </footer>
    </main>
  );
}
