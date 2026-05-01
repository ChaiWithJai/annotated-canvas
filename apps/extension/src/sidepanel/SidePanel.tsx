import { SourceRefSchema, toSourceDomain } from "@annotated/contracts";
import { Button, SourcePill } from "@annotated/ui";
import { Clock, FileText, Layers, Scissors, Send, Settings, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";

type CaptureMode = "context" | "drafts" | "annotations" | "settings";

const fallbackUrl = "https://www.youtube.com/watch?v=annotated-demo&t=263s";

export function SidePanel() {
  const [mode, setMode] = useState<CaptureMode>("context");
  const [commentary, setCommentary] = useState("");
  const [captureKind, setCaptureKind] = useState<"video" | "text">("video");
  const [status, setStatus] = useState<"idle" | "publishing" | "published">("idle");

  const source = useMemo(
    () =>
      SourceRefSchema.parse({
        source_url: fallbackUrl,
        source_domain: toSourceDomain(fallbackUrl),
        title: "Minimalist Design Theory: A Comprehensive Guide",
        favicon_url: "https://www.youtube.com/s/desktop/28b0985e/img/favicon_32x32.png"
      }),
    []
  );

  function publish() {
    setStatus("publishing");
    window.setTimeout(() => setStatus("published"), 600);
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
                <input defaultValue="00:04:23" inputMode="numeric" />
              </label>
              <span aria-hidden="true">-</span>
              <label>
                OUT
                <input defaultValue="00:05:10" inputMode="numeric" />
              </label>
            </div>
          ) : (
            <blockquote className="selection-preview">
              A quiet interface is not an empty interface. It is an interface where every visible thing
              has earned its place.
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
        </section>
      ) : (
        <section className="empty-pane">
          <p>{mode === "settings" ? "Connect account sync and provider settings." : "No saved items yet."}</p>
        </section>
      )}

      <footer className="sidepanel-footer">
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
